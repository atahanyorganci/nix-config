def --env cdi [] {
    zoxide query --list
        | lines
        | str replace --all $env.HOME "~"
        | sk --preview {|| str replace "~" $env.HOME | ^eza --all --group-directories-first --color=always --icons always --git-ignore }
        | str replace --all "~" $env.HOME
        | cd $in
}

