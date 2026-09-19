function open --description 'Open file in its default application'
    switch (uname -o)
        case Darwin
            set -f command open
        case "*Linux*"
            set -f command xdg-open
    end
    if test (count $argv) -eq 0
        command $command .
    else
        command $command $argv
    end
end
