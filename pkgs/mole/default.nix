{
  lib,
  stdenv,
  fetchFromGitHub,
  makeWrapper,
  go,
  git,
  cacert,
  bash,
  coreutils,
}:
stdenv.mkDerivation rec {
  pname = "mole";
  version = "1.22.1";

  src = fetchFromGitHub {
    owner = "tw93";
    repo = "mole";
    rev = "V${version}";
    sha256 = "sha256-WNTIW8EHCQVnEhMDK8Cag0vS9dhRbcMkRCvq0sCrI4M=";
  };

  nativeBuildInputs = [
    makeWrapper
    go
    git
    cacert
  ];

  buildInputs = [
    bash
    coreutils
  ];

  # Set up Go build environment
  preBuild = ''
    export HOME=$TMPDIR
    export GOCACHE=$TMPDIR/go-cache
    export GOPATH=$TMPDIR/go
    export SSL_CERT_FILE=${cacert}/etc/ssl/certs/ca-bundle.crt
  '';

  buildPhase = ''
    runHook preBuild

    # Build Go binaries
    echo "Building analyze binary..."
    go build -ldflags="-s -w" -o analyze-go ./cmd/analyze

    echo "Building status binary..."
    go build -ldflags="-s -w" -o status-go ./cmd/status

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    # Create directory structure
    mkdir -p $out/bin
    mkdir -p $out/libexec/mole/bin
    mkdir -p $out/libexec/mole/lib

    # Install the original mole script
    cp mole $out/libexec/mole/mole.sh
    chmod +x $out/libexec/mole/mole.sh

    # Install Go binaries
    cp analyze-go $out/libexec/mole/bin/
    cp status-go $out/libexec/mole/bin/
    chmod +x $out/libexec/mole/bin/analyze-go
    chmod +x $out/libexec/mole/bin/status-go

    # Install shell modules from bin/
    if [ -d bin ]; then
      cp -r bin/* $out/libexec/mole/bin/
      chmod +x $out/libexec/mole/bin/* 2>/dev/null || true
    fi

    # Install libraries
    if [ -d lib ]; then
      cp -r lib/* $out/libexec/mole/lib/
    fi

    # Create wrapper for mole
    makeWrapper $out/libexec/mole/mole.sh $out/bin/mole \
      --set SCRIPT_DIR $out/libexec/mole \
      --prefix PATH : ${lib.makeBinPath [coreutils]}

    # Create mo alias
    ln -s $out/bin/mole $out/bin/mo

    runHook postInstall
  '';

  meta = with lib; {
    description = "macOS system maintenance and cleanup tool";
    homepage = "https://github.com/tw93/mole";
    license = licenses.mit;
    platforms = platforms.darwin;
    maintainers = [];
    mainProgram = "mole";
  };
}
