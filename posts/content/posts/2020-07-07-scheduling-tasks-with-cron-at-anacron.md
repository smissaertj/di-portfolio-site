---
title: Scheduling Tasks with Cron, At and Anacron
date: 2020-07-07T20:57:41+04:00
url: /scheduling-tasks-with-cron-at-anacron
draft: false
toc: false
images:
categories:
  - Red Hat Enterprise Linux
tags:
  - tasks
  - cron
  - at
  - anacron
  - RHEL
  - RHCSA
---


{{< image src="/img/redhat-8-logo.png" alt="Red Hat logo" position="center" >}}

## Configuring Cron to Automate Recurring Tasks.

On Linux, the cron service is used to run processes automatically at specific times as a way to automate tasks that have to occur regularly.

The cron service consists of two major components:
* _The cron daemon_ checks every minute to see if there are any jobs to run.  
* _The cron configuration files_ work together to provide the right information to the right service at the right time.

### Managing the crond Service

Because some system tasks run through the `crond` service, this service is started  by default. The `crond` service itself doesn't need much management, it does not need to be reloaded or activated, the `crond` daemon wakes up every minute to see if anything needs to be run. You can monitor the current status of the service using the `systemctl status crond -l` command:

```
[root@server1 ~]# systemctl status crond -l
● crond.service - Command Scheduler
   Loaded: loaded (/usr/lib/systemd/system/crond.service; enabled; vendor preset: enabled)
   Active: active (running) since Sat 2020-07-04 14:22:31 +04; 3 days ago
 Main PID: 9134 (crond)
    Tasks: 1 (limit: 49648)
   Memory: 3.4M
   CGroup: /system.slice/crond.service
           └─9134 /usr/sbin/crond -n

Jul 07 12:01:01 server1 CROND[56917]: (root) CMD (run-parts /etc/cron.hourly)
Jul 07 13:01:01 server1 CROND[57001]: (root) CMD (run-parts /etc/cron.hourly)
Jul 07 14:01:01 server1 CROND[57303]: (root) CMD (run-parts /etc/cron.hourly)
Jul 07 15:01:01 server1 CROND[57551]: (root) CMD (run-parts /etc/cron.hourly)
Jul 07 16:01:01 server1 CROND[57582]: (root) CMD (run-parts /etc/cron.hourly)
Jul 07 17:01:01 server1 CROND[57621]: (root) CMD (run-parts /etc/cron.hourly)
Jul 07 18:01:01 server1 CROND[57715]: (root) CMD (run-parts /etc/cron.hourly)
Jul 07 19:01:01 server1 CROND[57807]: (root) CMD (run-parts /etc/cron.hourly)
Jul 07 19:01:01 server1 run-parts[57816]: (/etc/cron.hourly) finished 0anacron
Jul 07 20:01:01 server1 CROND[57845]: (root) CMD (run-parts /etc/cron.hourly)

```

The `systemctl` command uses the `journald` service to find out what is happening with the crond service.



### Cron Timing

A time string is used to specify when exactly a specific job should be run.
The following cron time and date fields can be used for this time string:

{{<table "table table-dark table-striped table-bordered">}}
Field | Values
-----|----
minute  | 0 - 59
hour |  0 - 23
day of month | 1 - 31
month | 1 - 12
day of week | 0 - 7 (Sunday is 0 or 7)
{{</table>}}

In any of the above fields you can use an `*` as a wildcard to refer to any value, ranges of numbers, lists and patterns are also allowed:
* `* 11 * * *` - Every minute between 11:00 and 11:59
* `0 11 * * 1-5` - Every weekday at 11:00
* `0 7-18 * * 1-5` - Every weekday between 7a.m. and 6p.m. at the top of the hour
* `0 */2 2 12 5` - Every 2 hours at the top of the hour, on the 2nd of December and every Friday in December.

```
# For details see man 4 crontabs

# Example of job definition:
# .---------------- minute (0 - 59)
# |  .------------- hour (0 - 23)
# |  |  .---------- day of month (1 - 31)
# |  |  |  .------- month (1 - 12) OR jan,feb,mar,apr ...
# |  |  |  |  .---- day of week (0 - 6) (Sunday=0 or 7) OR sun,mon,tue,wed,thu,fri,sat
# |  |  |  |  |
# *  *  *  *  * user-name  command to be executed
```


### Cron Configuration Files

The main configuration file for cron is `/etc/crontab`, but you will not change this file directly. Different Cron configuration files are used: 
* Cron files in `/etc/cron.d`
* Scripts in `/etc/cron.hourly`, `cron.daily`, `cron.weekly` and `cron.monthly`
* User-specific files created with `crontab -e`


Cron jobs can be created for specific users by either logging in as that user and executing `crontab -e` or executing `crontab -e -u USERNAME` as root.
`crontab -e` opens the `vi` editor and creates a temporary file. After saving your changes, the temporary file is moved to `/var/spool/cron` where a file is created for each user. These files should not be edited directly.

You can also add Cron jobs that are not tied to a specific user account, these will be executed by default as root unless you specify otherwise.
To do so you add a file where the content meets the syntax of a typical cron job inside the `/etc/cron.d` directory, the file name does not matter.

The last way to schedule Cron jobs is through the following directories:
* `/etc/cron.hourly`
* `/etc/cron.daily`
* `/etc/cron.weekly`
* `/etc/cron.monthly`

Scripts added to these directories should not contain any information on when it should be executed. You would only add scripts there if the exact time of execution does not really matter, the only thing that would matter is if the job needs to be launched once an hour, day, week or month. 


### The Purpose of Anacron

Anacron is the service that takes care of starting the hourly, daily, weekly and monthly jobs regardless of the exact time.
Anacron uses the `/etc/anacrontab` file for this:

```
[root@server1 cron.d]# cat /etc/anacrontab 
# /etc/anacrontab: configuration file for anacron

# See anacron(8) and anacrontab(5) for details.

SHELL=/bin/sh
PATH=/sbin:/bin:/usr/sbin:/usr/bin
MAILTO=root
# the maximal random delay added to the base delay of the jobs
RANDOM_DELAY=45
# the jobs will be started during the following hours only
START_HOURS_RANGE=3-22

#period in days   delay in minutes   job-identifier   command
1	5	cron.daily		nice run-parts /etc/cron.daily
7	25	cron.weekly		nice run-parts /etc/cron.weekly
@monthly 45	cron.monthly		nice run-parts /etc/cron.monthly
```

From the above we can see that Anacron will only run jobs between 3a.m. and 10p.m.  
The _period in days_ specifies the job execution frequency, _delay in minutes_ specifies how long Anacron waits before executing the job. Then we have the job identifier `cron.daily` and the command that's being executed (_nice run-parts /etc/cron.daily_)

> The need to configure jobs through Anacron is taken away by the `/etc/cron.hourly`, `cron.daily`, `cron.weekly` and `cron.monthly` directories.

Note that there is no single command that would show all currently scheduled jobs. The `crontab -l` command does list cron jobs, but only for the current user.


### Cron Security

By default, all users are allowed to create Cron jobs.  
To limit which user is allowed or not allowed to create Cron jobs we use the `/etc/cron.allow` and `/etc/cron.deny` files:

* If the `cron.allow` file exists, a user must be listed in the file to be allowed to use Cron.  
* If the `cron.deny` file exists, a user must **not** be listed in the file to be allowed to use cron.

> Both files should not exist at the same time.  
> If neither file exists, only root can use Cron.



## Configuring At to Schedule Future Tasks

The `atd` service is used for jobs that need to be executed only once and are thus not recurring.
You can use the `at` command followed by the time the job needs the be executed, either a specific time as in `at 14:00` or a time indication like `at noon` or `at teatime`. 

After typing the `at` command a shell opens where you can type several commands that will be executed on at the time you specified, press `CTRL-D` to leave the shell.

The `atq` command lists an overview of all currently scheduled jobs. You can remove a specific job using the `atrm` command followed by the job number.

> A load value can be specified when starting the `atd` service using the `-l` option.  
e.g. `atd -l 3.0` will make sure no job is started when the system load is higher than 3.0


```
[student@server1 ~]$ at noon
warning: commands will be executed using /bin/sh
at> echo "It's noon"
at> <EOT>
job 41 at Wed Jul 08 12:00:00 2020
[student@server1 ~]$ atq
41	Wed Jul 08 12:00:00 2020 a student
[student@server1 ~]$ atrm 41
[student@server1 ~]$ atq
[student@server1 ~]$ 

```

Instead of specifying commands to be executed interactively from the prompt, we can instruct `at` to execute an existing script or program simply by passing it as an argument to the -f flag (or by using input redirection):

```
[student@server1 ~]$ at now + 1 minute -f script.sh
warning: commands will be executed using /bin/sh
job 42 at Wed Jul 08 12:02:00 2020
[student@server1 ~]$ 

[student@server1 ~]$ at now + 1 minute < at_jobs.txt
warning: commands will be executed using /bin/sh
job 43 at Wed Jul 08 12:05:00 2020
[student@server1 ~]$ 
```