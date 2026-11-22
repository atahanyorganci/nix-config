/*
 * Runs a program as a child and waits for it, so that macOS privacy controls
 * (TCC) charge the program's file access to this launcher: TCC attributes a
 * launchd job's access to its top-level executable, and children inherit that
 * attribution. A grant to this binary (Network Volumes, Full Disk Access) then
 * covers whatever it starts, however often the program's Nix path changes.
 *
 * It must not exec the program: that would make the program itself the
 * responsible process. Signals launchd sends (stop, reload) are forwarded,
 * and the launcher exits the way the child did.
 */
#include <errno.h>
#include <signal.h>
#include <spawn.h>
#include <stdio.h>
#include <string.h>
#include <sys/wait.h>
#include <unistd.h>

extern char **environ;

static volatile pid_t child = 0;

static void forward(int sig) {
  if (child > 0)
    kill(child, sig);
}

int main(int argc, char **argv) {
  static const int signals[] = {SIGTERM, SIGINT, SIGHUP, SIGQUIT, SIGUSR1, SIGUSR2};
  struct sigaction action;
  pid_t pid;
  int status, rc;
  size_t i;

  if (argc < 2) {
    fprintf(stderr, "usage: %s program [argument ...]\n", argv[0]);
    return 64;
  }

  memset(&action, 0, sizeof action);
  action.sa_handler = forward;
  sigemptyset(&action.sa_mask);
  for (i = 0; i < sizeof signals / sizeof signals[0]; i++)
    sigaction(signals[i], &action, NULL);

  rc = posix_spawn(&pid, argv[1], NULL, NULL, argv + 1, environ);
  if (rc != 0) {
    fprintf(stderr, "%s: cannot run %s: %s\n", argv[0], argv[1], strerror(rc));
    return 127;
  }
  child = pid;

  while (waitpid(pid, &status, 0) < 0) {
    if (errno != EINTR) {
      perror("waitpid");
      return 1;
    }
  }

  if (WIFEXITED(status))
    return WEXITSTATUS(status);
  if (WIFSIGNALED(status)) {
    signal(WTERMSIG(status), SIG_DFL);
    raise(WTERMSIG(status));
    return 128 + WTERMSIG(status);
  }
  return 1;
}
