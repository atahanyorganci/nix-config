function git_check --description "Check for unsaved Git commits in repositories"
    # Default to current directory if no argument is provided
    set dir_to_check $argv[1]
    if test -z "$dir_to_check"
        set dir_to_check "$DEV_HOME"
    end

    info "Checking for unsaved Git commits in $dir_to_check..."

    # Find all git repositories in the specified directory
    for repo_path in (find $dir_to_check -type d -name ".git" 2>/dev/null)
        # Extract the repository directory (parent of .git)
        set repo_dir (dirname $repo_path)
        set repo_reported false

        # Move to the repository directory
        pushd $repo_dir >/dev/null

        debug "Checking repository: '$repo_dir'"

        # Get all local branches
        for branch in (git branch --format='%(refname:short)')
            debug "Checking '$repo_dir' branch '$branch'"

            # Check if the branch has a remote tracking branch
            set upstream (git for-each-ref --format='%(upstream:short)' refs/heads/$branch 2>/dev/null)

            if test -n "$upstream"
                # Check for unpushed commits
                set unpushed (git rev-list --count "$upstream..$branch" 2>/dev/null)

                if test "$unpushed" -gt 0
                    if test "$repo_reported" = false
                        set repo_reported true
                    end
                    warn "Repository '$repo_dir' on branch '$branch' has $unpushed unpushed commit(s)"
                end
            else
                # If no remote tracking branch exists and it's not a new repository
                set remote_count (git remote | wc -l)
                if test "$remote_count" -gt 0
                    if test "$repo_reported" = false
                        set repo_reported true
                    end
                    warn "Repository '$repo_dir' on branch '$branch' is not tracking any remote branch"
                end
            end
        end

        # Check for uncommitted changes
        if not git diff-index --quiet HEAD -- 2>/dev/null
            if test "$repo_reported" = false
                set repo_reported true
            end
            warn "Repository '$repo_dir' has uncommitted changes"
        end

        # Check for staged but uncommitted changes
        if not git diff --quiet --staged 2>/dev/null
            if test "$repo_reported" = false
                set repo_reported true
            end
            warn "Repository '$repo_dir' has staged but uncommitted changes"
        end

        # Return to the original directory
        popd >/dev/null
    end

    info "Check complete."
end
