def o [arg: string] {
    mut target  = $arg;
    if $target == null {
        $target = ".";
    }
    let os = $nu.os-info.name
    match $os {
        "macos" => {
            ^open $target
        }
        _ => {
            error make {
                msg: $"Unsupported OS: ($os)"
            }
        }
    }
}
