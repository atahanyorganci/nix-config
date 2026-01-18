def _get_hist_file_path():
    """
    Gets the path to the history file
    """
    import os

    if "PYTHONHISTFILE" in os.environ:
        history = os.path.expanduser(os.environ["PYTHONHISTFILE"])
    elif "XDG_DATA_HOME" in os.environ:
        data_home = os.path.expanduser(os.environ["XDG_DATA_HOME"])
        history = os.path.join(data_home, "python", "python_history")
    else:
        history = os.path.join(os.path.expanduser("~"), ".python_history")
    return os.path.abspath(history)


def _load_hist_file():
    """
    Loads the history file
    """
    import os

    history = _get_hist_file_path()
    directory, _ = os.path.split(history)
    os.makedirs(directory, exist_ok=True)


def _install_write_hook():
    """
    Installs the write hook
    """
    import readline

    history = _get_hist_file_path()
    default = readline.write_history_file
    readline.write_history_file = lambda *args: default(history)


_load_hist_file()
_install_write_hook()
