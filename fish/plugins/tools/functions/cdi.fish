function cdi --description "Interactively change directory"
    argparse -X 0 --name=cdi h/help "prompt=?" "layout=?" dry-run -- $argv
    if test $status != 0
        return 1
    end
    if set -q _flag_layout
        set layout $_flag_layout
    else
        set layout bottom-up
    end
    if set -q _flag_prompt
        set prompt $_flag_prompt
    else
        set prompt cd
    end
    set -l home_escaped (string replace -a "/" "\/" $HOME)
    set -l z_list (zoxide query -l)
    set list "~"
    for item in $z_list
        if string match -rq "$home_escaped\/(?<rest>.*)" $item
            set list "$list\n~/$rest"
        else
            set list "$list\n$item"
        end
    end
    set -l dir (printf $list | fzf --prompt="cd " --preview 'eza --icons (string replace "~" $HOME {})')
    if test $status != 0 -o "$dir" = ""
        return 1
    end
    set -l dir (string replace -a "~" "$HOME" $dir)
    if set -q _flag_dry_run
        echo "cd $dir"
    else
        cd $dir
    end
end
