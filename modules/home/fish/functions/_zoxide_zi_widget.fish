function _zoxide_zi_widget --description "Jump to a directory with zoxide"
    set -l dir (command zoxide query --interactive)
    and cd $dir
    commandline -f repaint
end
