def _parse_env_line [line: string] {
    let result = $line | parse -r '^(?<key>[A-Za-z_][A-Za-z0-9_]*)\s*=\s*(('(?<single>.*)')|("(?<double>.*)")|(?<raw>.*))\s*(#.*)?$'
    if ($result | is-empty) {
        return null
    }
    mut value = null
    if not ($result.double.0 | is-empty) {
        $value = $result.double.0
    } else if not ($result.single.0 | is-empty) {
        $value = $result.single.0
    } else {
        $value = $result.raw.0
    }
    return {
        key: $result.key.0,
        value: $value,
    }
}

def parse_env [file: string] {
    open $file
    | lines
    | str trim
    | each --flatten { _parse_env_line $in }
    | reduce --fold {} {|row, acc| $acc | insert $row.key $row.value }
}

def --env on_change [before: string, after: string] {
    if ($"($after)/.env" | path type) == "file" {
        parse_env $"($after)/.env" | tee { print } | load-env
    }
}

$env.config = ($env.config | upsert hooks {
    env_change: {
        PWD: [{|before, after| on_change $before $after }]
    }
})
