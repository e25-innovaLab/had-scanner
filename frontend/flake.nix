{
  description = "Entorno Next.js + TypeScript";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in {
      devShells.${system}.default = pkgs.mkShell {
        buildInputs = with pkgs; [
          nodejs_24
          pnpm
          git
          gh
          typescript
          typescript-language-server
        ];
        shellHook = ''
          export NODE_OPTIONS="--max-old-space-size=2048"
          export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath [
            pkgs.stdenv.cc.cc
            pkgs.zlib
          ]}
          echo "▲ Next.js + TypeScript Environment Activated (NixOS 26.05)"
          node -v && pnpm -v
        '';
      };
    };
}
