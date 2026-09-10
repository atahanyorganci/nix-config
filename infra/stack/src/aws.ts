import * as ec2 from "@distilled.cloud/aws/ec2";
import * as Action from "alchemy/Action";
import * as EC2 from "alchemy/AWS/EC2";
import * as Namespace from "alchemy/Namespace";
import * as Effect from "effect/Effect";
import * as Schedule from "effect/Schedule";
import * as String from "effect/String";

export { providers } from "alchemy/AWS";
export * as EC2 from "alchemy/AWS/EC2";

export const ROOT_VOLUME_GIB = 30;

const rootSshUserData = (publicKey: string) => `#cloud-config
disable_root: false
ssh_pwauth: false
users:
  - name: root
    lock_passwd: true
    ssh_authorized_keys:
      - ${publicKey}
runcmd:
  - mkdir -p /root/.ssh
  - if [ -f /home/ubuntu/.ssh/authorized_keys ]; then cat /home/ubuntu/.ssh/authorized_keys >> /root/.ssh/authorized_keys; fi
  - chmod 700 /root/.ssh
  - chmod 600 /root/.ssh/authorized_keys || true
`;

const describeInstance = (instanceId: string) =>
	ec2.describeInstances({ InstanceIds: [instanceId] }).pipe(
		Effect.map(result => (result.Reservations ?? []).flatMap(reservation => reservation.Instances ?? [])[0]),
		Effect.flatMap(instance =>
			instance ? Effect.succeed(instance) : Effect.die(new Error(`EC2 instance ${instanceId} not found`)),
		),
	);

const rootVolumeId = (instance: ec2.Instance) => {
	const rootName = instance.RootDeviceName;
	const mapping =
		(rootName ? instance.BlockDeviceMappings?.find(device => device.DeviceName === rootName) : undefined) ??
		instance.BlockDeviceMappings?.[0];
	const volumeId = mapping?.Ebs?.VolumeId;
	if (!volumeId) {
		return Effect.die(new Error(`EC2 instance ${instance.InstanceId ?? "unknown"} has no root EBS volume`));
	}
	return Effect.succeed(volumeId);
};

const volumeSizeGiB = (volumeId: string) =>
	ec2.describeVolumes({ VolumeIds: [volumeId] }).pipe(
		Effect.map(result => result.Volumes?.[0]?.Size),
		Effect.flatMap(size =>
			size !== undefined ? Effect.succeed(size) : Effect.die(new Error(`EBS volume ${volumeId} has no size`)),
		),
	);

const latestModification = (volumeId: string) =>
	ec2
		.describeVolumesModifications({ VolumeIds: [volumeId] })
		.pipe(Effect.map(result => result.VolumesModifications?.[0]));

export const AssociateEip = Action.Action(
	"AssociateEip",
	Effect.fn(function* ({ allocationId, instanceId }: { allocationId: string; instanceId: string }) {
		const result = yield* ec2.associateAddress({
			AllocationId: allocationId,
			InstanceId: instanceId,
			AllowReassociation: true,
		});
		return {
			allocationId,
			instanceId,
			associationId: result.AssociationId ?? "",
		};
	}),
);

export const GrowRootVolume = Action.Action(
	"GrowRootVolume",
	Effect.fn(function* ({ instanceId, sizeGiB }: { instanceId: string; sizeGiB: number }) {
		const instance = yield* describeInstance(instanceId);
		const volumeId = yield* rootVolumeId(instance);
		const currentSize = yield* volumeSizeGiB(volumeId);
		if (currentSize >= sizeGiB) {
			return { volumeId, sizeGiB: currentSize };
		}

		yield* ec2.modifyVolume({ VolumeId: volumeId, Size: sizeGiB });

		const modification = yield* latestModification(volumeId).pipe(
			Effect.repeat({
				schedule: Schedule.spaced("5 seconds"),
				until: value => {
					const state = value?.ModificationState;
					return state === "optimizing" || state === "completed" || state === "failed";
				},
				times: 36,
			}),
		);
		if (modification?.ModificationState === "failed") {
			return yield* Effect.die(
				new Error(`EBS volume ${volumeId} modification failed: ${modification.StatusMessage ?? "unknown error"}`),
			);
		}

		const size = yield* volumeSizeGiB(volumeId);
		if (size < sizeGiB) {
			return yield* Effect.die(new Error(`EBS volume ${volumeId} is ${size} GiB after modify; wanted ${sizeGiB} GiB`));
		}
		return { volumeId, sizeGiB: size };
	}),
);

export interface ExitNodeProps {
	name: string;
	publicKey: string;
	instanceType?: string;
	cidrBlock?: string;
}

export const exitNode = Effect.fn("AwsExitNode")(function* ({
	name,
	publicKey,
	instanceType = "t4g.medium",
	cidrBlock = "10.88.0.0/16",
}: ExitNodeProps) {
	return yield* Namespace.push(
		String.pascalCase(name),
		Effect.gen(function* () {
			const network = yield* EC2.Network("Network", {
				cidrBlock,
				availabilityZones: 1,
				nat: "none",
				tags: { Name: name },
			});
			const subnetId = network.publicSubnetIds[0];
			if (!subnetId) {
				return yield* Effect.die(`AWS network for ${name} has no public subnet`);
			}

			const securityGroup = yield* EC2.SecurityGroup("SecurityGroup", {
				vpcId: network.vpcId,
				description: `${name} SSH and NetBird WireGuard`,
				ingress: [
					{
						ipProtocol: "tcp",
						fromPort: 22,
						toPort: 22,
						cidrIpv4: "0.0.0.0/0",
						description: "SSH",
					},
					{
						ipProtocol: "udp",
						fromPort: 51820,
						toPort: 51820,
						cidrIpv4: "0.0.0.0/0",
						description: "NetBird WireGuard",
					},
				],
				egress: [
					{
						ipProtocol: "-1",
						cidrIpv4: "0.0.0.0/0",
						description: "all outbound",
					},
				],
				tags: { Name: name },
			});

			const keyPair = yield* EC2.KeyPair("DeployKey", {
				keyName: `${name}-deploy`,
				publicKeyMaterial: publicKey,
				tags: { Name: name },
			});

			const eip = yield* EC2.EIP("Ipv4", {
				domain: "vpc",
				tags: { Name: `${name}-ipv4` },
			});

			const instance = yield* EC2.Instance("Instance", {
				imageId: EC2.ubuntu2404({ architecture: "arm64" }),
				instanceType,
				subnetId,
				securityGroupIds: [securityGroup.groupId],
				keyName: keyPair.keyName,
				associatePublicIpAddress: true,
				sourceDestCheck: false,
				userData: rootSshUserData(publicKey),
				tags: {
					Name: name,
					PublicIp: eip.publicIp,
				},
			});

			const associated = yield* AssociateEip({
				allocationId: eip.allocationId,
				instanceId: instance.instanceId,
			});
			const grown = yield* GrowRootVolume({
				instanceId: instance.instanceId,
				sizeGiB: ROOT_VOLUME_GIB,
			});

			return {
				associated,
				eip,
				grown,
				instance,
				network,
				publicIp: eip.publicIp,
				securityGroup,
			};
		}),
	);
});
