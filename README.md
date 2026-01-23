# Dotfiles

Nix flake for managing system and home configuration for various host machines.

| Host                   |  OS & Architecture | Description                 |
| ---------------------- | ------------------ | --------------------------- |
| [`mercury`][mercury]   | `aarch64-linux`    | Home sever                  |
| [`mini`][mini]         | `aarch64-darwin`   | Mac Mini media server       |
| [`orb`][orb]           | `aarch64-linux`    | OrbStack VM for development |
| [`personal`][personal] | `aarch64-darwin`   | Personal computer           |

[mercury]: ./hosts/mercury/default.nix
[mini]: ./hosts/mini/default.nix
[orb]: ./hosts/orb/default.nix
[personal]: ./hosts/personal/default.nix
