---
title: Managing Shell Jobs and Processes on RHEL8
author: Joeri
date: 2020-06-20T13:57:41+00:00
url: /managing-shell-jobs-and-processes-on-rhel8/
swp_cache_timestamp:
  - 442812
categories:
  - Red Hat Enterprise Linux
tags:
  - processes
  - RHEL
  - RHCSA

---

{{< image src="/img/redhat-8-logo.png" alt="Red Hat logo" position="center" >}}

On Linux, we can distinct between three major process types: Shell jobs, Daemons and Kernel threads.

  * **Shell Jobs** are commands started from the command line and are also referred to as interactive processes.
  * **Daemons** are processes that provides services. They usually start when a computer is booted.
  * **Kernel threads** are part of the Linux kernel. You can _not_ manage them using the common tools discussed in this post.



## Managing Shell Jobs

### Running Jobs in the Foreground and Background

When you type a command, a shell job is started automatically in the foreground occupying the terminal until it finishes. This makes sense for commands that take little time to complete or commands that require user interaction.

If you know a command will take a significant amount to complete and it doesn't require user interaction, you can start it in the background by appending an `&` to the command, e.g. `dnf update -y &`  
  
You can move the last job that was started in the background to the foreground using the `fg` command. If multiple jobs are running, append the job ID, shown by the `jobs` command, to the `fg` command. 

It can happen you already executed a command and want to move it to the background. In this case use `CTRL+Z` to temporarily stop the job and execute the `bg` command to move it to the background. This does not remove the job from memory, it just pauses the job so that it can be managed. You can use `CTRL+C` to stop the current job and remove it from memory. 

```
[student@server1 ~]$ dd if=/dev/zero of=/dev/null
^Z
[1]+  Stopped                 dd if=/dev/zero of=/dev/null
[student@server1 ~]$ bg
[1]+ dd if=/dev/zero of=/dev/null &
[student@server ~]# jobs
[1]+  Running                 dd if=/dev/zero of=/dev/null &
[student@server1 ~]# fg 1
dd if=/dev/zero of=/dev/null
^C
9744376+0 records in
9744375+0 records out
4989120000 bytes (5.0 GB, 4.6 GiB) copied, 20.619 s, 242 MB/s
```


`CTRL+C` will terminate the job immediately without closing properly, which could result in data loss. An alternative key sequence you can use is `CTRL-D`, which sends the End Of File (EOF) character to the current job. The job will stop waiting for further input, complete what it was doing and terminate in a proper way.  

{{<table "table table-dark table-striped table-bordered">}}

| Command                              | Use                                                                                                                                                  |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `&` (at the end of a command line) | Start the command in the background.                                                                                                                 |
| `CTRL+Z`                           | Stop the current job temporarily so it can be managed.                                                                                               |
| `CTRL+D`                           | Send the EOF character to indicate it should stop waiting for input and close properly.                                                              |
| `CTRL+C`                           | Cancel the current job and remove it from memory.                                                                                                    |
| `bg`                               | Continues the job that has been temporarily stopped with CTRL+Z in the background.                                                                   |
| `fg`                               | Brings back to the foreground the last command that was moved to the background.                                                                     |
| `jobs`                             | Shows which jobs are currently running in the background. Displays job ID's that can be used as an argument to the `bg` and `fg` commands. |
{{</table>}}


### Parent-Child Relations

When a process is started from a shell, it becomes a child process of that shell. The parent is needed to manage the child, all processes started from a shell are terminated when that shell is stopped.

Processes started in the background will not be killed when the parent shell from which they are started is killed. If the parent is killed, the child process becomes a child of `systemd`:

```
[student@server1 ~]$ dd if=/dev/zero of=/dev/null &
[1] 3471
[student@server1 ~]$ exit
```

Open a new Terminal and check the running processes using ``ps fax``:

```
2293 ?        Ss     0:00 /usr/lib/systemd/systemd --user
3540 ?        R      0:32  \_ dd if=/dev/zero of=/dev/null
```

## Using Common Command-Line Tools for Process Management

### Understanding Processes and Threads

One process can start several worker threads. Threads can be handled by the different CPUs or CPU cores available on the machine. You can not manage individual threads, the programmer of the multithreaded application needs to define how threads relate to one another. 

As such, kernel threads can not be managed. You can not adjust priority and neither can you kill them except by taking the entire machine down. It's easy to recognize kernel threads, they have a name that is between square brackets:

```
[root@server1 ~]# ps aux | head
USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.1  0.7 179196 13988 ?        Ss   16:09   0:02 /usr/lib/systemd/systemd --switched-root --system --deserialize 18
root         2  0.0  0.0      0     0 ?        S    16:09   0:00 [kthreadd]
root         3  0.0  0.0      0     0 ?        I    16:09   0:00 [rcu_gp]
root         4  0.0  0.0      0     0 ?        I    16:09   0:00 [rcu_par_gp]
root         6  0.0  0.0      0     0 ?        I    16:09   0:00 [kworker/0:0H-kblockd]
root         8  0.0  0.0      0     0 ?        I    16:09   0:00 [mm_percpu_wq]
root         9  0.0  0.0      0     0 ?        S    16:09   0:00 [ksoftirqd/0]
root        10  0.0  0.0      0     0 ?        I    16:09   0:00 [rcu_sched]
root        11  0.0  0.0      0     0 ?        S    16:09   0:00 [migration/0]
```

### Using ps to Get Process Information

The most common command to get an overview of currently running processes is `ps`. Without arguments, the `ps` command shows only the processes started by the current user.

There are different options to display different process properties:
* `ps aux` displays a short summary of the active processes.  
* `ps -ef` shows the name of the process, but also the exact command it was started with.  
* `ps fax` shows hierarchical relationships between parent and child processes.

Note that some options to the `ps` command don't have to start with a hyphen.

```
[student@server1 ~]$ dd if=/dev/zero of=/dev/null &
[1] 4303
[student@server1 ~]$ ps | grep 4303
 4303 pts/0    00:00:08 dd

[student@server1 ~]$ ps aux | grep 4303
student   4303 96.5  0.0   7324   952 pts/0    R    16:50   0:17 dd if=/dev/zero of=/dev/null
student   4319  0.0  0.0  12108   976 pts/0    R+   16:51   0:00 grep --color=auto 4303

[student@server1 ~]$ ps -ef | grep 4303
student   4303  4271 99 16:50 pts/0    00:00:23 dd if=/dev/zero of=/dev/null
student   4327  4271  0 16:51 pts/0    00:00:00 grep --color=auto 4303

[student@server1 ~]$ ps fax | grep -b5 4303
16305- 2727 ?        Ssl    0:00  \_ /usr/libexec/evolution-addressbook-factory
16379- 2764 ?        Sl     0:00  |   \_ /usr/libexec/evolution-addressbook-factory-subprocess --factory all --bus-name org.gnome.evolution.dataserver.Subprocess.Backend.AddressBookx2727x2 --own-path /org/gnome/evolution/dataserver/Subprocess/Backend/AddressBook/2727/2
16643- 3811 ?        Ssl    0:00  \_ /usr/libexec/gvfsd-metadata
16702- 4192 ?        Ssl    0:00  \_ /usr/libexec/gnome-terminal-server
16768- 4271 pts/0    Ss     0:00  |   \_ bash
16808: 4303 pts/0    R      0:39  |       \_ dd if=/dev/zero of=/dev/null
16876- 4342 pts/0    R+     0:00  |       \_ ps fax
16922: 4343 pts/0    S+     0:00  |       \_ grep --color=auto -b5 4303
16988- 4202 ?        Sl     0:00  \_ /usr/libexec/gnome-control-center-search-provider
17069- 2316 ?        Sl     0:00 /usr/bin/gnome-keyring-daemon --daemonize --login
17146- 2446 tty2     Sl     0:00 /usr/libexec/ibus-x11 --kill-daemon
17209- 2529 ?        Ss     0:04 /usr/libexec/sssd/sssd_kcm --uid 0 --gid 0 --logger=files
17294- 2646 ?        Ssl    0:00 /usr/bin/spice-vdagent
[student@server1 ~]$ kill 4303
[1]+  Terminated              dd if=/dev/zero of=/dev/null
[student@server1 ~]$
```

You may have noticed I've used an important piece of information in my `ps |grep` commands above: the PID or process ID. An alternative way would be to use the `pgrep` command to get a list of all PIDs that have a name containing the string `dd`.


### Adjusting Process Priority with nice and renice

Processes are started with a specific priority. All regular processes are equal and started with the same priority: 20.  
  
In some cases it's useful to change the default priority and to do that we can use `nice` and `renice`. Use `nice` to start a process with an adjusted priority and `renice` to change the priority of an already running process.  
  
You can select values ranging from -20 to 19. The default _niceness_ of a process is set to 0, which results in the priority value of 20 (the lowest priority available). A negative niceness increases the process priority while a positive niceness decreases the priority. Best practice would be to use increments of 5 to see how that impacts the process. 

Kernel threads are started as real-time processes, you will never be able to block out kernel threads from CPU time by increasing the priority of a user process. 

Single-threaded processes running with the highest priority (niceness -20), can never get beyond the boundaries of the CPU its running on. 

Regular users can only decrease priority of a running process, you need to be root to give processes increased priority.

```
[student@server1 ~]$ nice -n 5 dd if=/dev/zero of=/dev/null &
[1] 4666
[student@server1 ~]$ renice -n 0 -p 4666
renice: failed to set priority for 4666 (process ID): Permission denied
[student@server1 ~]$ renice -n 10 -p 4666
4666 (process ID) old priority 5, new priority 10
[student@server1 ~]$ kill 4666
[1]+  Terminated              nice -n 5 dd if=/dev/zero of=/dev/null
[student@server1 ~]$
```

Notice the line that says `old priority 5, new priority 10`.  
This is actually misleading, it should say _niceness_ instead:  
The default process priority is 20 (which is a niceness of 0), so setting the niceness to 5 will lower the priority to 25. You can check that with the ``top`` command which I will come back to later on:


{{< image src="/img/priority-niceness.png" alt="TOP Priority Niceness" position="center" >}}


### Kill Signals with kill, killall and pkill

Remember that process have a parent-child relationship, the parent is responsible for the child process it created and killing a parent process will make all child process become children of the `systemd` process.

The Linux kernel allows many signals to be sent to process. We'll discuss 3 major signals that work for all processes:

  * `SIGTERM (15)`: Ask a process to stop.
  * `SIGKILL (9)`: Force a process to stop.
  * `SIGHUP (1)`: Hang up a process. The process will reread its configuration files. This comes in handy after making changes to a process configuration file.

To send a signal to a process, we use the `kill` command followed by the PID of the process. By default this will send the `SIGTERM` signal, the process will stop gracefully and close all open files.  
  
A process can however choose to ignore the `SIGTERM` signal, in that case we can force stop the process by sending the `SIGKILL` signal: `kill -9 <pid>`  
In general it's a bad idea to use the `SIGKILL` signal since you risk losing data and your system may become unstable if other processes depend on the killed process.

As an alternative to the `kill` command we have the `pkill` and `killall` commands. `pkill` takes the process name as an argument instead of the PID and `killall` will kill all processes using the same name simultaneously. 


### Using top to Manage Processes

`top` gives an overview of the most active processes currently running and allows you to do all previously discussed process management tasks.<

{{< image src="/img/top.png" alt="The top program" position="center" >}}


The 8th column (S) shows the process state:
{{<table "table table-dark table-striped table-bordered">}}

| State                         | Meaning                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Running (R)**               | The process is currently running and using CPU time.                                                   |
| **Sleeping (S)**              | The process is waiting for an event to complete.                                                       |
| **Uninterruptible sleep (D)** | The process is in a sleep state that can not be stopped, usually while waiting for I/O.                |
| **Stopped (T)**               | The process has been stopped. This typically happens to a shell job using the CTRL+Z sequence.         |
| **Zombie (Z)**                | The process was stopped but could not be removed by the parent, putting it into an unmanageable state. |
{{</table>}}

From within `top` use the `r` keyboard button to adjust the priority/niceness of a process and the `k` keyboard button to send kill signals to a process.

The load average is another important piece of information you can get with `top`. The load average is expressed as the number of processes that are in a running state (R) or blocking state (D) and is shown for the last 1, 5 and 15 minutes. You can get the same load average information using the `uptime` command:

```
[student@server1 ~]$ uptime
17:50:22 up  1:41,  1 user,  load average: 0.01, 0.08, 0.27
```

As a rule of thumb, the load average should not be higher than the number of CPUs or CPU cores on the system. If the load average over a longer period of time is higher than the number of CPUs there may be a performance issue. You can check the number of CPUs and/or cores using the `lscpu` command:

```
[student@server1 ~]$ lscpu
Architecture:        x86_64
CPU op-mode(s):      32-bit, 64-bit
Byte Order:          Little Endian
CPU(s):              2
On-line CPU(s) list: 0,1
Thread(s) per core:  1
Core(s) per socket:  1
Socket(s):           2</code></pre>
```

In the above example I have 2 CPUs, so the load average on my system over a longer period of time should not be above 2.


### Summary

We learned how to create and manage background jobs, lookup specific processes, terminating processes and changing priorities.