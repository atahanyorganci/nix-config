function fish_title --description "Set terminal title"
    if set -q argv[1]
        set -l arg $argv[1]
        echo "[$arg] @ "
    end
    set -l escaped (string replace -a "/" "\/" $HOME)
    if string match -rq "$escaped(?<path>.*)" $PWD
        echo "~$path"
    else
        echo $PWD
    end
end
