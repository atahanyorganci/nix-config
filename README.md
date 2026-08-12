# Dotfiles

Nix flake for managing system and home configuration for various host machines.

| Host                 |  OS & Architecture | Description                    |
| -------------------- | ------------------ | ------------------------------ |
| [`mercury`][mercury] | `x86_64-linux`     | Home server                    |
| [`venus`][venus]     | `aarch64-darwin`   | Mac Mini media server          |
| [`sol`][sol]         | `aarch64-darwin`   | Personal computer              |
| [`moon`][moon]       | `aarch64-linux`    | OrbStack VM for development    |
| [`mars`][mars]       | `x86_64-linux`     | Netbird server                 |
| [`jupiter`][jupiter] | `x86_64-linux`     | Hermes Agent server            |
| [`pluto`][pluto]     | `x86_64-linux`     | Base Hetzner VPS configuration |

[mercury]: ./hosts/mercury/default.nix
[venus]: ./hosts/venus/default.nix
[sol]: ./hosts/sol/default.nix
[moon]: ./hosts/moon/default.nix
[mars]: ./hosts/mars/default.nix
[jupiter]: ./hosts/jupiter/default.nix
[pluto]: ./hosts/pluto/default.nix
