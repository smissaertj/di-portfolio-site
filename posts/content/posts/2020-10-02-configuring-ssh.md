---
title: "Network Services - Configuring SSH"
date: 2020-10-02
url: /network-services-configuring-ssh
toc: false
draft: false
images:
tags:
  - RHEL
  - Network services
  - SSH
---

{{< image src="/img/redhat-8-logo.png" alt="Red Hat logo" position="center" >}}


# Hardening the SSH Server

SSH is a convenient and important solution to establish remote connections to servers. If your SSH server is visible directly from the internet, you can be sure that sooner or later intruders will try to connect to it, intending to do harm.

Dictionary attacks are common against an SSH server. SSH servers usually offer their services on port 22, and every Linux servers has a `root` account. Based on this information it's easy for an attacker to try to log in as `root` by guessing the password if the password has limited complexity and no additional security measures are in place. Sooner or later the intruder will be able to connect.

We can protect ourselves against these kind of attacks by:
* Disabling root login.
* Disabling password login and using key-based authentication.
* Configuring a non default port for SSH to listen on.
* Allowing only specific users to log in on SSH.


## Limiting Root access
SSH servers have `root` login enabled by default, which is a big security concern. Disabling `root` login is easy: Modify the `PermitRootLogin` parameter in `/etc/ssh/sshd_config` and reload or restart the service:

```
# Authentication:

#LoginGraceTime 2m
PermitRootLogin no
#StrictModes yes
#MaxAuthTries 6
#MaxSessions 10
```


## Configuring Alternative Ports
Security problems on Linux servers start with a port scan issued by an attacker. There are 65,535 ports that can potentially be listening, and scanning all those ports takes a lot of time so most port scans focus on well known ports only. Port 22 is always among these ports.

To protect against port scans we can configure the SSH server to listen on another port. You can choose a completely random port, as long as the port is not already in use by another service.

```
# If you want to change the port on a SELinux system, you have to tell
# SELinux about this change.
# semanage port -a -t ssh_port_t -p tcp #PORTNUMBER
#
Port 39860
#AddressFamily any
#ListenAddress 0.0.0.0
#ListenAddress ::
```

> To avoid being locked out of the server after making changes to the SSH listing port, it's a good idea to open two sessions. Use one session to apply the port change and test, use the other sessions to keep your current connection open. Active sessions will not be disconnected after restarting the SSH server (unless the restart fails), so if something is wrong with the configuration and you're not longer able to connect you still have the second session to fix the problem.



## Modifying SELinux to Allow for Port Changes
After changing the SSH port you also need to configure SELinux to allow this change. Network ports are labeled with SELinux security labels to prevent services from accessing ports they shouldn't.

Use the ***semanage port*** command to change the label on the target port. Before doing so, it's a good idea to check if the port already has a label: ***semanage port -l***, e.g. `semanage port -l | grep ssh`


If the port doesn't have a label, use the ***-a*** option to add a label, if it does have a label use ***-m*** to modify the current security label.

`semanage port -a -t ssh_port_t -p tcp 39860`  
`semanage port -m -t ssh_port_t -p tcp 443` 



## Limiting User Access
The `AllowUsers` option takes a space separated list of usernames that will be allowed to login through SSH. If the user `root` still needs to be able to log in you'll have to include it as well in the list. 

> This option does *not* appear anywhere in the `/etc/ssh/sshd_config` file by default.


Another interesting option is `MaxAuthTries`. It specifies the maximum number of authentication attempts permitted per connection.`MaxAuthTries` is also useful for analyzing security events, it logs failed login attempts once the number of failures reaches half this value. The higher the number of attempts, the more likely it is an intruder is trying to get in.  
SSH writes log information about failed login attempts to the AUTHPRIV syslog facility. This facility is by default configured to write information to `/var/log/secure`.


# Other Useful sshd Options
Apart from security-related options, there are some useful miscellaneous options you can use to streamline performance.

## Session Options
On RHEL8, `GSSAPIAuthentication` option is set to ***yes*** by default. This option is only useful in an environment where Kerberos authentication is used. Having this feature on slows down the authentication procedure.

The `UseDNS` option is also enabled by default and instructs the SSH server to lookup the remote hostname and check with DNS that the hostname maps back to the same IP address (Reverse DNS Lookup). Although this option has some security benefits, it also involves a significant performance penalty. Set this to `no` if client connections are slow. 

> To give an example on Reverse DNS lookups, assume you're connecting from a client with the `8.8.8.8` ip address. The SSH server will lookup the PTR record for the `8.8.8.8.in-addr.arpa` domain which would result in `dns.google`. In turn, this result resolves back to `8.8.8.8`.  The reverse DNS database of the Internet is rooted in the `.arpa` top-level domain.  

```
$ dig -x 8.8.8.8
;; ANSWER SECTION:
8.8.8.8.in-addr.arpa.	76082	IN	PTR	dns.google.

$ dig dns.google
;; ANSWER SECTION:
dns.google.		824	IN	A	8.8.4.4
dns.google.		824	IN	A	8.8.8.8 

```

The `MaxSessions` option specifies the maximum number of sessions that can be opened from one IP address simultaneously. You might need to increase this option beyond the default value of 10.


## Connection Keepalive Options
The `TCPKeepAlive` option is used to monitor whether the client is still available.
This option is by default enabled and sends a keepalive probe packet with the ACK flag to the client after a certain amount of time. If a reply is received, the SSH server can assume that the connection is still up and running.

The `ClientAliveInterval` option sets an interval in seconds after which the server sends a packet to the client if no activity has been detected. The `ClientAliveCountMax` parameter specifies how many of these should be sent. So if the `ClientAliveInterval` is set to `30` and the `ClientAliveCountMax` to `10`, inactive connections are kept alive for about 5 minutes.

>The equivalent client side options are `ServerAliveInterval` and `ServerAliveCountMax`, useful if you cannot change the configuration of the SSH server.




# Configuring Key-Based Authentication with Passphrases
By default, password authentication is allowed on RHEL 8 SSH servers. You can disable password authentication and allow public/private key-based authentication only by setting the `PasswordAuthentication` option to `no`.

When using key-based authentication you can set a passphrase which makes the key pair stronger. In case an intruder has access to the private key he would also need to know the passphrase before being able to use the key.

Without further configuration the use of passphrases would mean that users have to enter the passphrase every time before a connection can be created, which is inconvenient. To work around this we can cache the passphrase for a session:
* Execute the `ssh-agent /bin/bash` command to start the agent for the current (Bash) shell.
* Execute `ssh-add` to add the passphrase for the current user's private key. The key is now cached.
* Connect to the remote server, you'll notice you do not need to enter the passphrase.



# Copying and synchronizing files securely over SSH
`scp` is a program for copying files securely between computers using the SSH protocol.  
The basic usage is as follows:  

* To copy a local file to a remote host:  `scp localfile remote_host:remote_path`  
* To copy a remote file to a local path: `scp remote_host:remote_file localpath`  
* To copy entire directory trees, add the `-r` option: `scp -r remote_host:path/directory .`

Rsync, which stands for “remote sync”, is a remote and local file synchronization tool. It uses an algorithm that minimizes the amount of data copied by only moving the portions of files that have changed. The basic syntax is similar to that of `scp`: `rsync source destination`.

* `rsync -anvzP --progress remote_host:/path/to/directory/ /some/local/path`

The `-a` option is a combination flag, it stands for "archive" and syncs recursively and preserves symbolic links, special and device files, modification times, group, owner, and permissions. You could use `-r` to only sync recursively instead.    
The `-n` flag is the same as the `--dry-run` option and allows you to check results before actually running the synchronization. You need the `-v` flag (verbose) to get the appropriate output to verify.  
The `-z` option can reduce network transfer by adding compression.  
The `-P` flag combines the `--progress` and `--partial` options, it gives you a progress bar and allows you to resume interrupted transfers.  
Finally, you can use the `-A` flag to preserve Access Control Lists, and the `-X` flag to preserve SELinux context labels.

> Notice the traling slash `/` at the end of the first argument in the example command. This is necessary to include the contents of the source path. Without the trailing slash, `directory` would be created inside `/some/local/path`.
