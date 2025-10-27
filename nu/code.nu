def c [...args] {
  if ($args | is-empty) {
    ^code .
  } else {
    ^code ...$args
  }
}
