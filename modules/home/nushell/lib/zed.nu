def zed [...args] {
  if ($args | is-empty) {
    ^zeditor .
  } else {
    ^zeditor ...$args
  }
}
