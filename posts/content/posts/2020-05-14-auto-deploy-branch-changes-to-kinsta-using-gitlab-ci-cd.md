---
title: Auto Deploy Branch Changes to Kinsta using GitLab CI/CD
author: Joeri
date: 2020-05-14T10:28:03+00:00
url: /auto-deploy-branch-changes-to-kinsta-using-gitlab-ci-cd/
swp_cache_timestamp:
  - 442843
categories:
  - Lab
tags:
  - CI/CD
  - git
  - Gitlab
  - Kinsta
  - WordPress

---

{{< image src="/img/kinsta-logo-alpha-purple-300x60.png" alt="Kinsta Inc. logo" position="center" >}}

{{< image src="/img/gitlab-icon-rgb-300x276.png" alt="GitLab logo" position="center" style="width:100px; margin-top:10px">}}

If you're comfortable using the command line, you're probably aware there are different ways you can push your Kinsta Staging site to Live without overwriting the Live database. This can be useful when you need to push code changes, and at the same time need to leave the Live database in its current state. 

This post will cover how you can achieve this using [GitLab CI/CD](https://about.gitlab.com/stages-devops-lifecycle/continuous-integration/) and assumes you're familiar with version control using `git`, and using the Kinsta Staging environment for testing and development. If you're developing locally, you should be able to apply the information in this post as well. 

The end result will be that whenever you merge changes into the `master` branch on _Staging_ and push those changes to the remote `master` branch, GitLab will automatically deploy the updated `master` branch to Kinsta _Live_.  
  
As an added bonus you will also have implemented version control so you can easily roll back any changes you make to your code. 

Let's get started!

## Create a Kinsta Site and GitLab Project

If you don't have a Kinsta site already, create one following the instructions [here](https://kinsta.com/knowledgebase/new-site/). In this case, I'll create _an empty site_ with the name `gitlabautodeploy` and add WordPress later on. 

Next, we'll [create an empty project on Gitlab](https://docs.gitlab.com/ee/gitlab-basics/create-project.html). This repository will contain our website's files. In my case I'll create a private project.

<div style="height:50px" aria-hidden="true" class="wp-block-spacer">
</div>

## Cloning, Configuring and Populating the GitLab Repo on Kinsta

### Setting up SSH Keys

In order to clone the repository on our Live environment, we'll have to add our SSH public key to our GitLab SSH Keys.  
  
[Connect to Live via SSH](https://kinsta.com/knowledgebase/connect-to-ssh/) and copy the output of the below command, then add it your GitLab _account settings_ following the instructions [here](https://docs.gitlab.com/ee/ssh/#adding-an-ssh-key-to-your-gitlab-account).

```
gitlabautodeploy@gsY-gitlabautodeploy:~$ cat .ssh/id_rsa.pub
```

This will allow us to access and clone the repository over SSH without the need for authentication. 

[Add the same public key to your SSH Keys in My Kinsta](https://kinsta.com/feature-updates/add-ssh-keys/) This step is equally important as the next. Without this step GitLab will not be able to connect to the Live environment. 

Next, we want to add our SSH _private_ key as a variable to the repository's CI/CD Pipeline settings. Copy the output of the below command:

```
gitlabautodeploy@gsY-gitlabautodeploy:~$ cat .ssh/id_rsa
```

Under `Settings > CI/CD` _in your GitLab repo_, add a new Variable containing your private key. Give the variable the name `SSH_PRIVATE_KEY`, paste the private key in the Value field, and add the variable.

{{< image src="/img/gitlab_variable.png" alt="GitLab SSH Privat Key Variable" position="center" >}}

The private key will allow GitLab to connect to our Kinsta Live environment and deploy the changes we've pushed from Staging. 

### Clone and Configure the Repo

We can now clone the empty repository onto Kinsta Live. Go to your repository overview on GitLab and click the blue Clone dropdown, select Clone with SSH and copy the value. 


{{< image src="/img/git_clone-1-1024x290.png" alt="GitLab Clone Repository" position="center" >}}


Paste the value after the `git clone` command inside the home directory on Live and execute it:

```
gitlabautodeploy@gsY-gitlabautodeploy:~$ git clone git@gitlab.com:joerismissaert/gitlabautodeploy.git
```

Once the cloning has finished, you'll notice an extra folder was created with the name of our repository:

```
gitlabautodeploy@gsY-gitlabautodeploy:~$ ls -lh
total 19K
drwxr-xr-x 3 gitlabautodeploy www-data 3 May 14 08:57 gitlabautodeploy
```

By default, Kinsta serves websites from the `~/public` folder. You can reach out to support to have this changed, but in this case I'll delete the existing `public` folder and rename my cloned repository to `public`:

```
gitlabautodeploy@gsY-gitlabautodeploy:~$ rm -rf public/
gitlabautodeploy@gsY-gitlabautodeploy:~$ mv gitlabautodeploy public
gitlabautodeploy@gsY-gitlabautodeploy:~$
```

In the next step we'll configure our repo:

```
gitlabautodeploy@gsY-gitlabautodeploy:~$ cd public
gitlabautodeploy@gsY-gitlabautodeploy:~/public$ git config --global user.email "youremail@address.com"
gitlabautodeploy@gsY-gitlabautodeploy:~/public$ git config --global user.name "Joeri"
gitlabautodeploy@gsY-gitlabautodeploy:~/public$
```

## Install and Configure WordPress

We are now ready to install and configure WordPress. Go ahead and download the latest version of WordPress inside your repository on Live:

```
gitlabautodeploy@gsY-gitlabautodeploy:~/public$ wp core download
Downloading WordPress 5.4.1 (en_US)…
md5 hash verified: 346afd52e893b2492e5899e4f8c91c43
Success: WordPress downloaded.
gitlabautodeploy@gsY-gitlabautodeploy:~/public$
```

If you know how to setup WordPress manually, great! Else you can use the Web Interface by going to the Primary Domain for your Kinsta site. Follow the instructions and configure the site.


#### Configuring the GitLab CI/CD Pipeline

We need to add a YAML file called `.gitlab-ci.yml` to our repository that contains instructions for GitLab to deploy our changes to Live. When GitLab detects this file, it will start up a Docker container and configure the Docker environment based on the instructions in our file to be able to connect to our Live environment and deploy the updated `master` branch.  
  
Create the `.gitlab-ci.yml` file and add the following:

```
before_script:
    - apt-get update -qq
    - apt-get install -qq git
    # Setup SSH deploy keys
    - 'which ssh-agent || ( apt-get install -qq openssh-client )'
    - eval $(ssh-agent -s)
    - ssh-add <(echo "$SSH_PRIVATE_KEY")
    - mkdir -p ~/.ssh
    - '[[ -f /.dockerenv ]] && echo -e "Host *\n\tStrictHostKeyChecking no\n\n" &gt; ~/.ssh/config'

deploy_live:
    type: deploy
    environment:
        name: Live
        url: gitlabautodeploy.kinsta.cloud
    script:
        - ssh kinstauser@IPADDRESS -p PORTNUMBER "cd /www/gitlabautodeploy_941/public && git checkout master && git pull origin master && exit"
    only:
        - master
```

Pay attention to the `deploy_live` block where you will want to modify the `url`, `ssh` connection string and the path in the command. Nothing is actually being done with the `url` value in this case though.  
  
The `only: - master` part refers to the branch of your repository that should trigger this script when changes have been pushed to it. If you change this, make sure to change the SSH command accordingly.  
  
You could add a `deploy_staging` block that contains the SSH connection string for the Staging environment and the `only: - staging` block list item so that a `git push` to the equally named `staging` branch would trigger a deploy to Kinsta's Staging environment from your local development environment for example.


#### Initial Commit

Once the site is set up and you've confirmed it's working properly, we can commit and push our changes to the remote repository on GitLab.  
  
We'll **create a new branch** for our repository called `v0.1`, then start tracking all the files we added to our Repo, commit our changes, and push our changes to the remote origin on the new branch.

```
gitlabautodeploy@gsY-gitlabautodeploy:~/public$ git checkout -b v0.1
Switched to a new branch 'v0.1'
gitlabautodeploy@gsY-gitlabautodeploy:~/public$ git add .
gitlabautodeploy@gsY-gitlabautodeploy:~/public$ git commit -a -m 'Initial Commit'
gitlabautodeploy@gsY-gitlabautodeploy:~/public$ git push origin v0.1
```

### Creating Staging and Testing the Deployment

We're all set up, let's create the Staging environment and run some tests.  
Follow the instructions [here](https://kinsta.com/knowledgebase/staging-environment/) to create the Staging environment and connect to Staging using SSH. 

We should still be on the new branch we created earlier and we'll see the `wp-config.php` file has been modified. This was done by Kinsta's Staging creation script and is completely normal.

```
gitlabautodeploy@XJl-staging-gitlabautodeploy:~/public$ git status
On branch v0.1
Changes not staged for commit:
(use "git add …" to update what will be committed)
(use "git restore …" to discard changes in working directory)
modified: wp-config.php
no changes added to commit (use "git add" and/or "git commit -a")
gitlabautodeploy@XJl-staging-gitlabautodeploy:~/public$
```

Before we go and commit the change, let's add a simple plugin: `classic-editor`

```
gitlabautodeploy@XJl-staging-gitlabautodeploy:~/public$ wp plugin install classic-editor
Downloading installation package from https://downloads.wordpress.org/plugin/classic-editor.1.5.zip…
Unpacking the package…
Installing the plugin…
Plugin installed successfully.
Success: Installed 1 of 1 plugins.
gitlabautodeploy@XJl-staging-gitlabautodeploy:~/public$
```

Add all untracked files, commit the changes and push the changes to the remote origin on the `v0.1` branch:

```
gitlabautodeploy@XJl-staging-gitlabautodeploy:~/public$ git add .
gitlabautodeploy@XJl-staging-gitlabautodeploy:~/public$ git commit -a -m 'Installed classic-editor plugin'
gitlabautodeploy@XJl-staging-gitlabautodeploy:~/public$ git push origin v0.1
gitlabautodeploy@XJl-staging-gitlabautodeploy:~/public$
```

Now let's switch to our `master` branch, merge the `v0.1` branch and push the merge to the remote `master` branch:

```
gitlabautodeploy@XJl-staging-gitlabautodeploy:~/public$ git checkout master
Switched to branch 'master'
gitlabautodeploy@XJl-staging-gitlabautodeploy:~/public$ git merge v0.1
gitlabautodeploy@XJl-staging-gitlabautodeploy:~/public$ git push origin master
```

Go to your GitLab project: `CI / CD > Jobs`, where you'll see the deployment running:

{{< image src="/img/gitlab_pipe_running-1024x157.png" alt="GitLab deploy job running" position="center" >}}


You can click on the Status to see the deployment in action:
{{< image src="/img/gitlab_pipe_details-1024x269.png" alt="GitLab deploy job running" position="center" >}}


If everything went well, the Status will change from `running` to `passed` and your live site now has the `classic-editor` plugin installed. 

{{< image src="/img/gitlab_pipe_passed.png" alt="GitLab deploy job running" position="center" >}}
