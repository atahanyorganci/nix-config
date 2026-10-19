import * as Schema from "effect/Schema";

/** A host's `meshServices.<name>`: a port reached directly over the mesh. */
export const MeshService = Schema.Struct({
	port: Schema.Number,
	protocol: Schema.Literals(["tcp", "udp"]),
	groups: Schema.Array(Schema.String),
});
export type MeshService = typeof MeshService.Type;

export const MeshServiceHost = Schema.Struct({
	name: Schema.String,
	services: Schema.Record(Schema.String, MeshService),
});
export type MeshServiceHost = typeof MeshServiceHost.Type;

/** `flake.meshServices`: host name -> the services it serves over the mesh. */
export const MeshServices = Schema.Record(Schema.String, MeshServiceHost);
export type MeshServices = typeof MeshServices.Type;
