---
title: "Enhancing Linux Security with SELinux"
date: 2020-12-16
url: /enhancing-linux-security-with-selinux
toc: false
draft: false
images:
tags:
  - RHEL
  - Security
  - SELinux
---

{{< figure class="center" src="/img/redhat-8-logo.png" alt="Red Hat logo">}}
{{< figure class="center" src="/img/selinux.png" alt="SELinux logo" width="200px">}}


SELinux is a security enhancement module, deployed on top of Linux, which provides improved security via Role Based Access Controls (RBACs) on subjects and objects (processes and resources). Traditional Linux security used Discretionary Access Controls (DACs).

With DAC, a process can access any file, directory, device or other resource that leaves itself open to access. Using RBAC, a process only has access to resources that it is explicitely allowd to access, based on the assigned role. The way that SELinux implements RBAC is to assign an SELinux policy to a process. That process restricts access as follows:
* Only let the process access resources that carry the explicit labels
* Make potentially insecure features, e.g. write access to a directory, available as Booleans, which can be turned on or off.


SELinux is not a replacement for DAC, it's an additional security layer:
* DAC rules are still used when using SELinux;
* DAC rules are checked first, if those allow access then SELinux policies are checked;
* If DAC rules deny access then SELinux policies are not checked.


In essence, SELinux severaly limits what potentially malicious code may gain access to and generally limits activity on the Linux system.


# Understanding How SELinux Works

SELinux provides a combination of Role Based Access Control and either *Type Enforcement* (TE) or *Multi-Level Security* (MLS). In RBAC, access to an object is granted or denied based on the subject's assigned role in the organization. It's not based on usernames or process ID. In this post I will focus only on Type Enforcement, which is the default SELinux *targeted policy*.

## Type Enforcement

Type Enforcement is necessary to implement the RBAC model, it secures a system through these methods:
* Labeling objects as certain security types;
* Assigning subjects to particular domains and roles;
* Providing rules to allow certain domains and roles to access certain object types.

Let's look at an example.
The below `ls -l` command shows the DAC controls on the files. The output shows the file's owner, group and permissions:
```
[student@localhost my_stuff]$ ls -l
total 0
-rw-rw-r--. 1 student student 0 Jan 19 06:25 test001
```

We can add the `-Z` option to display the SELinux RBAC controls too:
```
[student@localhost my_stuff]$ ls -lZ
total 0
-rw-rw-r--. 1 student student unconfined_u:object_r:user_home_t:s0 0 Jan 19 06:25 test001
```

The last example displays four items assiciated with the file that are specific to SELinux:
* **user** `unconfined_u`
* **role** `object_r`
* **type** `user_home_t`
* **level** `s0`

The above four RBAC items are used in the SELinux access control  to determine appropriate access levels. Together, these items are called the SELinux *security context* or sometimes the *security label*.

These security contexts are given to to subjects (processes and users). Each security context has a specific name. The name given depends upon what object or subject it has been assigned: Files have a file context, users have a user context, and processes have a process context also referred to as a domain.

The rules allowing access are called allow rules or policy rules. A policy rule is the process SELinux follows to grant or deny access to a particular system security type. Thus, Type Enforcement ensures that only certain "types" of subjects can access certain "types" of objects.


## Implementing SELinux Security Models

SELinux implements the RBAC model through a combination of four primary SELinux pieces:
* Operational modes
* Security contexts
* Policy types
* Policy rule packages

We already touched on some of these design elements.

### Understanding SELinux Operational Modes

SELinux comes with three operational modes: *disabled, permissive* and *enforcing*.
Each of these modes offeres different benefits for Linux system security.

#### Using Disabled Mode

In the *disabled* mode, SELinux is turned off. The default method of access control, Discretionary Access Control, is used instead.


#### Using Permissive Mode

In *permissive* mode, SELinux is turned on, but the security policy rules are not enforced. When a security policy rule should deny access, access will still be allowed. However, a message is sent to a log file denoting that access should've been denied.

SELinux permissive mode is useful for testing and troubleshooting. 

#### Using Enforcing Mode

In *enforcing* mode SELinux is turned on and all of the security policy rules are enforced.


### Understanding SELinux Security Contexts

An SELinux security context is the method used to classify objects (such as files) and subjects (such as users or programs). A security context consists of four attributes: `user`, `role`, `type` and `level`.

* **User** - The `user` attribute is a mapping of a Linux username to an SELinux name. This is not the same as a users's login name, and it's referred to specifically as the SELinux user. The SELinux username ends with a `_u`, making it easy to identify in the output. Regular unconfined users have an `unconfined_u` user attribute in the default targeted policy.

* **Role** - The `role` attribute is assigned to subjects and objects. Each role is granted access to other subjects and objects based on the role's security clearance and the object's classification level. Users are assigned a role and that role is authorized for particular types of domains (or process context). The SELinux role has `_r` at the end. Processes run by `root` have a `system_r` role, while regular users run processes under the `unconfined_r` role.

* **Type** - The `type` attribute defines a domain type for processes, a user type for users, and a file type for files. This attribute is also called the security type. Most policy rules are concerned with the security type of a process and what files, ports, devices and other resources that process has access to based on their security types. The SELinux type name ends with a `_t`.

* **Level** - The `level` is an attribute of Multi-Level Security (MLS), it's optional in Type Enforcement. 

#### Users, Files, and Processes Have Security Contexts

To see your SELinux user context, enter the `id` command at the shell prompt:
```
[student@localhost ~]$ id
uid=1000(student) gid=1000(student) groups=1000(student) context=unconfined_u:unconfined_r:unconfined_t:s0-s0:c0.c1023
[student@localhost ~]$
```

Use the `-Z` option on the `ls` command to see an individual file's context:
```
[student@localhost my_stuff]$ ls -lZ
total 0
-rw-rw-r--. 1 student student unconfined_u:object_r:user_home_t:s0 0 Jan 19 06:25 test001
```

Use the `-Z` option on the `ps` command to see a process's security context:
```
[student@localhost my_stuff]$ ps -eZ | grep bash
unconfined_u:unconfined_r:unconfined_t:s0-s0:c0.c1023 2872 pts/0 00:00:00 bash

[student@localhost my_stuff]$ ps -eZ | grep systemd
system_u:system_r:init_t:s0           1 ?        00:00:01 systemd
system_u:system_r:syslogd_t:s0      638 ?        00:00:00 systemd-journal
```

### Understanding SELinux Policy Types

The policy type directly determines what sets of policy rules are used to dictate what an object can access. The policy type also determines what specific security context attributes are needed.

SELinux has different policies:
* Targeted (default)
* MLS
* Minimum

The *Targeted policy's* primary purpose is to restrict "targeted" daemons, but it can also restrict other processes and users. Targeted daemons are sandboxed, they run in an environment where their access to other objects is tightly controlled so that no malicious attacks launched through those daemons can affect other services or the Linux system as a whole. 

All subjects and objects not targeted are run in the `unconfined_t` domain. This domain has no SELinux policy restrictions and thus only used traditional Linux security.


### SELinux Policy Rule Packages

Policy rules are installed with SELinux and are grouped into packages, also called modules.

There is user documentation on these various policy modules in the form of HTML files. To view this documentation on RHEL, open your browser and enter the following url:
`file:///usr/share/doc/selinux-policy/html/index.html`

If you don't have the policy documentation you can install it:
`yum install selinux-policy-doc`

This documentation allows you to review how policy rules are created and packaged.


# Configuring SELinux

SELinux comes preconfigured, you can use the SELinux features without any configuration.
The configuration can only be set and modified by `root`. The primary configuration file is `/etc/sysconfig/selinux` which is a symlink to `/etc/selinux/config`:
```
[root@localhost ~]# ls -lh /etc/sysconfig/selinux 
lrwxrwxrwx. 1 root root 17 Sep 26 09:44 /etc/sysconfig/selinux -> ../selinux/config
[root@localhost ~]# cat /etc/sysconfig/selinux 

# This file controls the state of SELinux on the system.
# SELINUX= can take one of these three values:
#     enforcing - SELinux security policy is enforced.
#     permissive - SELinux prints warnings instead of enforcing.
#     disabled - No SELinux policy is loaded.
SELINUX=enforcing
# SELINUXTYPE= can take one of these three values:
#     targeted - Targeted processes are protected,
#     minimum - Modification of targeted policy. Only selected processes are protected. 
#     mls - Multi Level Security protection.
SELINUXTYPE=targeted
```

This file allows you to set the mode and policy type.

## Setting the SELinux Mode and Policy Type

We can use the `getenforce` command to see the *current* SELinux mode, to see both the `current` mode and the mode set in the configuration file, use the `sestatus` command:
```
[root@localhost ~]# getenforce
Enforcing

[root@localhost ~]# sestatus
SELinux status:                 enabled
SELinuxfs mount:                /sys/fs/selinux
SELinux root directory:         /etc/selinux
Loaded policy name:             targeted
Current mode:                   enforcing
Mode from config file:          enforcing
Policy MLS status:              enabled
Policy deny_unknown status:     allowed
Memory protection checking:     actual (secure)
Max kernel policy version:      31
```

To change the mode setting, you can use the `setenforce` command with either the `0` or `permissive` argument, or the `1` or `enforcing` argument.
This will change the SELinux mode during runtime and leaves the setting in the primary configuration file untouched. Rebooting the system will apply the mode set in the primary configuration file.

> You cannot use `setenforce` to change SELinux to disabled mode.

Switching from `disabled` to `enforcing` should be done using the primary configuration file and a reboot. Using the `setenforce` command may hang your system due to incorrect file labels. Rebooting after changing from `disabled` may take a while as the filesystem will be relabeled.  

This means that SELinux checks and changes the security context of any files with incorrect security contexts that can cause problems in the new mode, and any file not labeled will be labeled with contexts. This process can take a long time since each file's context is checked.


The policy type you choose determines whether SELinux enforces TE, MLS or Minimum. The default policy type is `targeted`.
When setting the policy type to MLS or Minimum you need to make sure you have the policy package installed:
`yum list selinux-policy-mls selinux-policy-minimum`


## Managing SELinux Security Contexts

Current SELinux file and process security contexts can be viewed using the `secon` command:
* `-u` Shows the user of the security context.
* `-r` Shows the role of the security context.
* `-t` Shows the type of the security context.

Without any arguments, the command shows you the current process's security context:
```
[student@localhost ~]$ secon -urt
user: unconfined_u
role: unconfined_r
type: unconfined_t
```

To view another process's security context, use the `-p` option followed by the process id.
e.g. `systemd`:
```
[student@localhost ~]$ secon -urt -p 1
user: system_u
role: system_r
type: init_t
```

To view a file's security context, use the `-f` option:
```
[student@localhost ~]$ secon -urt -f /etc/passwd
user: system_u
role: object_r
type: passwd_file_t
```

> The `secon` command does not show the security context for the current user, instead use the `id` command.

### Setting Security Context Types

> Since the RHCSA exam focuses only on context types, I will not be covering the user and role contexts.

To set a context type we can use the `semanage` command.
`semanage` writes the new context to the SELinux policy from where it can be applied to the file system.

The `semanage` command may not be available by default. You can find the RPM containing `semanage` using `yum whatprovides */semanage`:
```
[root@localhost ~]# yum whatprovides */semanage
policycoreutils-python-utils-2.9-9.el8.noarch : SELinux policy core python utilities
Repo        : BaseOS
Matched from:
Filename    : /usr/sbin/semanage
Filename    : /usr/share/bash-completion/completions/semanage
```

The `policycoreutils-python-utils` has to be installed in order to use `semanage`.

To set context using `semanage` we need to know the appropriate context type. An easy way to find the appropriate context is by looking at the default context settings on already-existing items:
```
[root@localhost ~]# ls -lZ /var/www
total 0
drwxr-xr-x. 2 root root system_u:object_r:httpd_sys_script_exec_t:s0  6 Jun  8  2020 cgi-bin
drwxr-xr-x. 4 root root system_u:object_r:httpd_sys_content_t:s0     61 Jan  6 12:19 html
```
`/var/www/html` is a default location for the Apache HTTP Service. If we would want to add a new folder to `/var/www` to serve content with Apache, we now know we need the `http_sys_content_t` context type. 

For demonstration purposes, let's created the `my_dir` directory in our home folder, then move it to `/var/www`. The reason why we do this is because if we create the directory in `/var/www` it will inherit the correct context type from the parent directory.
```
[root@localhost ~]# ls -lZ /var/www
total 0
drwxr-xr-x. 2 root root system_u:object_r:httpd_sys_script_exec_t:s0  6 Jun  8  2020 cgi-bin
drwxr-xr-x. 4 root root system_u:object_r:httpd_sys_content_t:s0     61 Jan  6 12:19 html
drwxr-xr-x. 2 root root unconfined_u:object_r:admin_home_t:s0         6 Jan 20 11:44 my_dir
```

The `mv` command kept the `admin_home_t` context type on our directory.
We can change the context type as follows:
```
[root@localhost ~]# semanage fcontext -a -t httpd_sys_content_t "/var/www/my_dir(/.*)?"
[root@localhost ~]# ls -lZd /var/www/my_dir
drwxr-xr-x. 2 root root unconfined_u:object_r:admin_home_t:s0 6 Jan 20 11:44 /var/www/my_dir
```



The `-a` option is used to add a context type, then we use `-t` to specify the context type. The last part of the command indicates the folder we apply the changes to and contains a regular expression, `(/.*)?`, to refer to the directory `my_dir` and anything that exists below that directory.

Notice how the `semanage` command didn't provide any output, and our `ls -lZd` command still shows the original context type.
This is because using `semanage` we only applied the context type to the SELinux policy but not to the file system. We need to apply the change to the file system using `restorecon`:
```
[root@localhost ~]# restorecon -R -v /var/www/my_dir
Relabeled /var/www/my_dir from unconfined_u:object_r:admin_home_t:s0 to unconfined_u:object_r:httpd_sys_content_t:s0
[root@localhost ~]# ls -lZd /var/www/my_dir
drwxr-xr-x. 2 root root unconfined_u:object_r:httpd_sys_content_t:s0 6 Jan 20 11:44 /var/www/my_dir
```

The following example changes the SELinux context type on a network port, assuming you would want to make the `ssh` service available over port 2222.
```
[root@localhost ~]# semanage port -l | grep ssh
ssh_port_t                     tcp      22
[root@localhost ~]# semanage port -a -t ssh_port_t -p tcp 2222
[root@localhost ~]# semanage port -l | grep ssh
ssh_port_t                     tcp      2222, 22
```



### Finding the Context Type You Need

There are three approaches in finding the context type you need:
* Look at the default environment;
* Read the configuration files;
* Use `man -k _selinux` to find the SELinux-specific man pages for your service.

The man pages are not installed by default, to install them you need to install the `policycoreutils-devel` package. Once installed, use the `mandb` command to update the man page database and issue the `sepolicy manpage -a -p /usr/share/man/man8` command to install the SELinux man pages:

```
[root@localhost ~]# yum whatprovides */sepolicy
policycoreutils-devel-2.9-9.el8.i686 : SELinux policy core policy devel utilities
Repo        : BaseOS
Matched from:
Filename    : /usr/bin/sepolicy
Filename    : /usr/share/bash-completion/completions/sepolicy

[root@localhost ~]# yum install -y policycoreutils-devel
...

[root@localhost ~]# sepolicy manpage -a -p /usr/share/man/man8
...

[root@localhost ~]# mandb
...

[root@localhost ~]# man -k _selinux | grep http
apache_selinux (8)   - Security Enhanced Linux Policy for the httpd processes
httpd_helper_selinux (8) - Security Enhanced Linux Policy for the httpd_helper processes
httpd_passwd_selinux (8) - Security Enhanced Linux Policy for the httpd_passwd processes
...

[root@localhost ~]# man apache_selinux
```

### Restoring Default File Contexts

Previously, we applied the context type from the policy to the file system using the `restorecon` command. The policy contains the default settings for most files and directories, so if ever a wrong context setting is applied we can use `restorecon` to reapply the default from the policy to the file system.

Using `restorecon` this way can be useful to fix problems on new files. There's a specific way context settings are applied:
* If a new file or directory is created, it inherits the context type of the parent directory.
* If a file or directory is copied, this is considered a new file or directory.
* If a file is moved, or copied using `cp -a` and thus keeping properties, the original context type is applied.

The latter of the above 4 ways can be fixed by using `restorecon`. It's also possible to relabel the entire file system using `restorecon -Rv /` or by creating the file `/.autorelabel` in the root `/`. The next time you reboot the system will discover the `/.autorelabel` file and the entire file system will be relabeled.



### Managing SELinux via Booleans

SELinux Booleans are provided to easily change the behaviour of a rule. A Boolean is a switch that toggles a setting on or off and it allows you to change parts of a SELinux policy rule without any knowledge of policy writing. These changes are applied during runtime and do not require a reboot. 

You can get a list of Booleans using the `getsebool -a` command and filtering that down using `grep`:
```
[root@localhost ~]# getsebool -a | grep httpd
httpd_anon_write --> off
httpd_builtin_scripting --> on
httpd_can_check_spam --> off
httpd_can_connect_ftp --> off
httpd_can_connect_ldap --> off
httpd_can_connect_mythtv --> off
httpd_can_connect_zabbix --> off
...
```

The `semanage boolean -l` command provides more detail, it shows the current setting and the default one.
```
[root@localhost ~]# semanage boolean -l | head
SELinux boolean                State  Default Description

abrt_anon_write                (off  ,  off)  Allow ABRT to modify public files used for public file transfer services.
abrt_handle_event              (off  ,  off)  Determine whether ABRT can run in the abrt_handle_event_t domain to handle ABRT event scripts.
```

To set a Boolean we use `setsebool` and to apply the change permanently we add the `-P` option:
```
[root@localhost ~]# getsebool -a | grep ftpd
ftpd_anon_write --> off
...

[root@localhost ~]# setsebool ftpd_anon_write on
[root@localhost ~]# semanage boolean -l | grep ftpd_anon
ftpd_anon_write                (on   ,  off)  Determine whether ftpd can modify public files used for public file transfer services. Directories/Files must be labeled public_content_rw_t.

[root@localhost ~]# setsebool -P ftpd_anon_write on
[root@localhost ~]# semanage boolean -l | grep ftpd_anon
ftpd_anon_write                (on   ,   on)  Determine whether ftpd can modify public files used for public file transfer services. Directories/Files must be labeled public_content_rw_t.
```


## Troubleshooting SELinux Policy Violations

SELinux logs everything it is doing, the primary source to get logging information is the audit log which is in `/var/log/audit/audit.log`. Message are logged with `type=AVC`, which stands for *Access Vector Cache*. 

```
[root@localhost ~]# grep AVC /var/log/audit/audit.log | tail -1
type=AVC msg=audit(1611246770.937:136): avc:  denied  { getattr } for  pid=4178 comm="httpd" path="/test/index.html" dev="dm-0" ino=35157701 scontext=system_u:system_r:httpd_t:s0 tcontext=unconfined_u:object_r:default_t:s0 tclass=file permissive=0
```

The first relevant part in the output is the text `acv: denied { getattr }`. This means some process tried to read the attributes of a file and it was denied access.
Further down we can see `comm="httpd"` which means the command that was trying to issue the getattr request was `httpd`. Next, we see `path="test/index.html"`, which is the file that this process tried to access.

In the last part we see information about the source context and the target context:
`scontext=system_u:system_r:httpd_t:s0 tcontext=unconfined_u:object_r:default_t:s0`

>`default_t` is used for files that do not match any pattern in the SELinux policy. I created `/test/index.html` in the root and SELinux doesn't know what security context to give to this file, so it assigned `default_t`.

We also see that Permissive mode is disabled:
`permissive=0`

The issue here is that the SELinux policy denies access from the `httpd_t` security context to the `default_t` security context.
We can solve this issue by setting the correct target security context:
```
[root@localhost ~]# semanage fcontext -a -t httpd_sys_content_t "/test(/.*)?"
[root@localhost ~]# restorecon -Rv /test
Relabeled /test from unconfined_u:object_r:default_t:s0 to unconfined_u:object_r:httpd_sys_content_t:s0
Relabeled /test/index.html from unconfined_u:object_r:default_t:s0 to unconfined_u:object_r:httpd_sys_content_t:s0
```

### Analyzing SELinux with Sealert

We can use `sealert` to easier understand SELinux messages in `/var/log/audit/audit.log`.
First, you need to install `sealert`: `yum install setroubleshoot-server`

Once this is installed, issue the `journalctl | grep sealert` command:
```
Jan 21 11:32:57 localhost.localdomain setroubleshoot[4395]: SELinux is preventing httpd from getattr access on the file /test/index.html. For complete SELinux messages run: sealert -l e4fc58ab-c1c0-4525-a955-eff9a5570a7c
Jan 21 11:33:00 localhost.localdomain setroubleshoot[4395]: SELinux is preventing httpd from getattr access on the file /test/index.html. For complete SELinux messages run: sealert -l e4fc58ab-c1c0-4525-a955-eff9a5570a7c
```

Follow the instructions and run `saelert -l UUID`.
`sealert` will analyze what's happened and provide some suggestions what you need to do to fix the problem. Each suggestion will have a confidence score and the higher this score the more likely the suggested solution would be applicable. 

```
[root@localhost ~]# sealert -l e4fc58ab-c1c0-4525-a955-eff9a5570a7c
SELinux is preventing httpd from getattr access on the file /test/index.html.

*****  Plugin catchall_labels (83.8 confidence) suggests   *******************

If you want to allow httpd to have getattr access on the index.html file
Then you need to change the label on /test/index.html
Do
# semanage fcontext -a -t FILE_TYPE '/test/index.html'
...
```

