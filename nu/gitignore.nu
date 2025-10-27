use std/log

let REPO_OWNER = "github"
let REPO_NAME = "gitignore"
let REPO_HOME = $"($env.XDG_DATA_HOME)/($REPO_NAME)"
let REPO_URL = $"https://github.com/($REPO_OWNER)/($REPO_NAME)"

def _gitignore_init [] {
    let result = ^git clone $REPO_URL $REPO_HOME | complete
    if $result.exit_code != 0 {
        error make {
            msg: $"Failed to clone ($REPO_URL) into ($REPO_HOME)"
        }
    }
}

def "gitignore update" [] {
    log debug $"Repo URL: ($REPO_URL)"
    log debug $"Repo Home: ($REPO_HOME)"

    let exists = $REPO_HOME | path exists
    if not $exists {
        print $"`($REPO_OWNER)/($REPO_NAME)` doesn't exist! Cloning..."
        _gitignore_init
        print "DONE!"
    } else {
        cd $REPO_HOME
        let result = ^git pull | complete
        if $result.exit_code != 0 {
            error make {
                msg: $"Failed to update repo at ($REPO_HOME)"
            }
        }
        print "DONE!"
    }
}

def gitignore [] {
    log debug $"Repo URL: ($REPO_URL)"
    log debug $"Repo Home: ($REPO_HOME)"

    let exists = $REPO_HOME | path exists
    if not $exists {
        print $"`($REPO_OWNER)/($REPO_NAME)` doesn't exist! Cloning..."
        _gitignore_init
        print "DONE!"
    }
    ls $REPO_HOME
        | where type == file and name =~ '\.gitignore$'
        | get name
        | path basename
        | sk --preview {[$REPO_HOME $in] | path join | ^bat -f $in }
        | tee { print $"Copied ($in) to ($env.PWD).gitignore" }
        | [$REPO_HOME $in] | path join
        | cp $in $"($env.PWD)/.gitignore"
}
