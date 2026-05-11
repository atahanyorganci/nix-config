function c --description Cursor --wraps cursor
    if test (count $argv) -gt 0
        command cursor $argv
    else
        command cursor .
    end
end
