import * as EC2 from "alchemy/AWS/EC2";
import * as Namespace from "alchemy/Namespace";
import * as Output from "alchemy/Output";
import * as Effect from "effect/Effect";
import * as String from "effect/String";

/**
 * Root disk size. The Ubuntu AMIs ship an 8 GiB root, too small to install
 * NixOS onto, so the volume is sized at launch instead.
 */
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

export interface ExitNodeProps {
	name: string;
	publicKey: string;
	imageId: string;
	/**
	 * The root device of `imageId` (`RootDeviceName` in `describe-images`).
	 * It must match: under any other name AWS attaches a second, empty volume
	 * and leaves the root at the AMI's size.
	 */
	rootDeviceName: string;
	/**
	 * The account's default VPC. The instance is launched without a subnet, so
	 * AWS places it in the default subnet of `availabilityZone`, which assigns
	 * public IPv4 addresses.
	 */
	vpcId: EC2.VpcId;
	availabilityZone: string;
	instanceType?: string;
}

export const exitNode = Effect.fn("AwsExitNode")(function* ({
	name,
	publicKey,
	imageId,
	rootDeviceName,
	vpcId,
	availabilityZone,
	instanceType = "t4g.medium",
}: ExitNodeProps) {
	if (!/^vpc-[0-9a-f]{8}(?:[0-9a-f]{9})?$/.test(vpcId)) {
		return yield* Effect.die(`${name}: ${vpcId} is not a VPC ID`);
	}

	return yield* Namespace.push(
		String.pascalCase(name),
		Effect.gen(function* () {
			const securityGroup = yield* EC2.SecurityGroup("SecurityGroup", {
				vpcId,
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

			// No `subnetId` or `associatePublicIpAddress`: either one makes Alchemy
			// build an explicit network interface, which needs a subnet. Without
			// them AWS picks the zone's default subnet and its public IP.
			const instance = yield* EC2.Instance("Server", {
				imageId,
				instanceType,
				availabilityZone,
				securityGroupIds: [securityGroup.groupId],
				keyName: keyPair.keyName,
				sourceDestCheck: false,
				blockDeviceMappings: [
					{
						deviceName: rootDeviceName,
						ebs: {
							volumeSize: ROOT_VOLUME_GIB,
							volumeType: "gp3",
							deleteOnTermination: true,
						},
					},
				],
				userData: rootSshUserData(publicKey),
				tags: { Name: name },
			});

			// The auto-assigned address: it survives reboots but changes when the
			// instance is stopped and started, or replaced.
			const publicIp = Output.mapEffect((ip: string | undefined) =>
				ip
					? Effect.succeed(ip)
					: Effect.die(
							`${name} has no public IPv4 address; does the default subnet in ${availabilityZone} assign one?`,
						),
			)(instance.publicIpAddress);

			return { instance, publicIp, securityGroup };
		}),
	);
});
