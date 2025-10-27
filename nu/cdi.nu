def --env cdi [] {
    const preview_command = "nu -c 'echo "{}" | str replace "~" $env.HOME | xargs eza --icons --all --group-directories-first --color=always'";
    let choice = zoxide query --list
        | lines
        | str replace --all $env.HOME "~"
        | str join (char nl)
        | ^fzf --prompt "cd " --preview $preview_command
        | complete
    if $choice.exit_code != 0 {
        return
    }
    let dest = ($choice.stdout | str trim)
    if ($dest | is-empty) {
        return
    }
    let dest_abs = ($dest | str replace --all "~" $env.HOME)
    cd $dest_abs
}

