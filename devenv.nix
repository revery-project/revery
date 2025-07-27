{pkgs, ...}: {
  packages = [pkgs.git pkgs.just];

  languages = {
    rust = {
      enable = true;
      channel = "stable";
    };

    javascript = {
      enable = true;

      npm = {
        enable = true;
      };
    };
  };

  git-hooks.hooks = {
    # Nix

    alejandra.enable = true;

    # Rust

    cargo-check.enable = true;
    rustfmt.enable = true;
    clippy.enable = true;

    test = {
      enable = true;
      entry = "cargo test";
      pass_filenames = false;
      stages = ["pre-push"];
    };

    # Javascript

    eslint.enable = true;
    prettier.enable = true;
  };
}
