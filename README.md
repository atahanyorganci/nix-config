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
| [`saturn`][saturn]   | `aarch64-linux`    | US NetBird exit node (EC2)     |
| [`pluto`][pluto]     | `x86_64-linux`     | Base Hetzner VPS configuration |

[mercury]: ./modules/hosts/mercury.nix
[venus]: ./modules/hosts/venus.nix
[sol]: ./modules/hosts/sol.nix
[moon]: ./modules/hosts/moon.nix
[mars]: ./modules/hosts/mars.nix
[jupiter]: ./modules/hosts/jupiter.nix
[saturn]: ./modules/hosts/saturn.nix
[pluto]: ./modules/hosts/pluto.nix
