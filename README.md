# Dotfiles

Nix flake for managing system and home configuration for various host machines.

| Host                      |  OS & Architecture | Description                 |
| ------------------------- | ------------------ | --------------------------- |
| [`personal`][macbook-pro] | `aarch64-darwin`   | Personal computer           |
| [`work`][macbook-pro]     | `aarch64-darwin`   | Work computer               |
| [`orb`][orb]              | `aarch64-linux`    | OrbStack VM for development |
| [`mercury`][mercury]      | `aarch64-linux`    | Home sever                  |

[macbook-pro]: ./hosts/macbook-pro/default.nix
[orb]: ./hosts/orb/default.nix
[mercury]: ./hosts/mercury/default.nix
