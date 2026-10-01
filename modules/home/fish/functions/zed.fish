function zed --description Zed --wraps zeditor
    if test (count $argv) -gt 0
        command zeditor $argv
    else
        command zeditor .
    end
end
