---
title: "Kubernetes 101: Building Scalable Applications - ConfigMaps & Secrets"
date: 2022-02-01
url: /kubernetes-101-building-scalable-applications-configmaps-secrets
toc: false
draft: false
images:
  - /img/kubernetes.png
tags:
  - Containers
  - Docker
  - Kubernetes
  - 
---

{{<figure class="center" src="/img/kubernetes.png" alt="Kubernetes logo" width="200px">}}


## Providing Variables to Kubernetes Applications
While we shouldn't run naked Pods, we've already seen we can pass environment variables when creating a Pod:  
`kubectl run mydb --image=mysql --env="MYSQL_ROOT_PASSWORD=password"`

When creating a Deployment, however, there's no command line option to provide variables. We'll need to create the Deployment first, then set the environment variables:  
- `kubectl create deploy mydb --image=mysql`
- `kubectl set env deploy mydb MYSQL_ROOT_PASSWORD=password`

Obviously you could generate the Deployment YAML file first and add your variables to the YAML file before creating the Deployment.

```
student@minikube:~$ kubectl create deployment mydb --image=mariadb
deployment.apps/mydb created

student@minikube:~$ kubectl get pods
NAME                   READY   STATUS   RESTARTS   AGE
mydb-fb7ff4d78-kqbvj   0/1     Error    0          40s

student@minikube:~$ kubectl logs mydb-fb7ff4d78-kqbvj
2022-04-16 07:41:41+00:00 [Note] [Entrypoint]: Entrypoint script for MariaDB Server 1:10.7.3+maria~focal started.
2022-04-16 07:41:41+00:00 [Note] [Entrypoint]: Switching to dedicated user 'mysql'
2022-04-16 07:41:41+00:00 [Note] [Entrypoint]: Entrypoint script for MariaDB Server 1:10.7.3+maria~focal started.
2022-04-16 07:41:41+00:00 [ERROR] [Entrypoint]: Database is uninitialized and password option is not specified
	You need to specify one of MARIADB_ROOT_PASSWORD, MARIADB_ALLOW_EMPTY_ROOT_PASSWORD and MARIADB_RANDOM_ROOT_PASSWORD

student@minikube:~$ kubectl set env deploy mydb MYSQL_ROOT_PASSWORD=password
deployment.apps/mydb env updated

student@minikube:~$ kubectl get pods
NAME                    READY   STATUS              RESTARTS      AGE
mydb-6df85bcdbb-thm2h   0/1     ContainerCreating   0             5s
mydb-fb7ff4d78-kqbvj    0/1     Error               3 (47s ago)   108s

student@minikube:~$ kubectl get pods
NAME                    READY   STATUS    RESTARTS   AGE
mydb-6df85bcdbb-thm2h   1/1     Running   0          13s

student@minikube:~$ kubectl get deploy mydb -o yaml > mydb.yml
...
```

```
student@minikube:~$ kubectl create deploy mynewdb --image=mariadb --dry-run=client -o yaml > mynewdb.yaml
student@minikube:~$ kubectl create -f mynewdb.yaml 
deployment.apps/mynewdb created

student@minikube:~$ kubectl set env deploy mynewdb MYSQL_ROOT_PASSWORD=password --dry-run=client -o yaml > mynewdb.yaml 
student@minikube:~$ grep -i password mynewdb.yaml 
        - name: MYSQL_ROOT_PASSWORD
          value: password

student@minikube:~$ kubectl describe deploy mynewdb | grep -i password
student@minikube:~$ kubectl apply -f mynewdb.yaml 
deployment.apps/mynewdb configured

student@minikube:~$ kubectl describe deploy mynewdb | grep -i password
      MYSQL_ROOT_PASSWORD:  password
```


## ConfigMaps
Code should be static, which makes it portable so that it can be used in other environments. To achieve this we need to separate site-specific information, like environment variables, from the code. These should not be provided in the Deployment configuration.

ConfigMaps are the solution to this issue, we can define variables and have our Deployment point to the ConfigMap.
ConfigMaps are created in a different way depending what it will be used for:
- Variables
- Configuration Files
- Command line arguments

### Providing Variables with ConfigMaps
We can create a ConfigMap for variables in two ways:
- By passing a file that contains the variables in a `key=value` format:  
`kubectl create cm mycm --from-env-file=myfile`
- By passing the variables directly:  
`kubectl create cm mycm--from-literal=MYSQL_ROOT_PASSWORD=password`

Once you have the ConfigMap, you can update your deployment so that it points to the ConfigMap:
`kubectl set env --from=configmap/mycm deploy/mydeployment`

```
student@minikube:~$ cat dbvarsfile 
MYSQL_ROOT_PASSWORD=password
MYSQL_USER=joeri

student@minikube:~$ kubectl create cm mydbvars --from-env-file=dbvarsfile 
configmap/mydbvars created

student@minikube:~$ kubectl create deploy mydb --image=mariadb
deployment.apps/mydb created

student@minikube:~$ kubectl set env deploy mydb --from=configmap/mydbvars
deployment.apps/mydb env updated

student@minikube:~$ kubectl describe deploy mydb | grep MYSQL_
      MYSQL_ROOT_PASSWORD:  <set to the key 'MYSQL_ROOT_PASSWORD' of config map 'mydbvars'>  Optional: false
      MYSQL_USER:           <set to the key 'MYSQL_USER' of config map 'mydbvars'>           Optional: false

student@minikube:~$ kubectl get deploy mydb -o yaml > mydb.yaml
...
``` 


### Providing Configuration Files with ConfigMaps
In addition to providing variables, we can provide configuration files to our application by making use of ConfigMaps:  
`kubectl create cm myconf --from-file=/my/file.conf`

If a ConfigMap is created from a directory instead of a file, all files in that directory will be included in the ConfigMap.
When using ConfigMap for configuration files the ConfigMap must be mounted in the application, it behaves similarly to a Volume.

From a high level, we need to:
- Generate the base YAML code, then add the ConfigMap mount to it later
- Define a Volume of the ConfigMap type in the application manifest
- Mount this volume on a specific directory, the configuration file will appear inside that directory. 

In the below example we'll provide an `index.html` file to Nginx via a ConfigMap:
```
student@minikube:~$ echo "Hello World!" > index.html
student@minikube:~$ kubectl create cm myindex --from-file=index.html
configmap/myindex created

student@minikube:~$ kubectl describe cm myindex
Name:         myindex
Namespace:    default
Labels:       <none>
Annotations:  <none>

Data
====
index.html:
----
Hello World!


BinaryData
====

Events:  <none>

student@minikube:~$ kubectl create deploy myweb --image=nginx
deployment.apps/myweb created
```
  
We'll edit the deployment and add `volumes` and `volumeMounts` to `spec.template.spec`:
```
student@minikube:~$ kubectl edit deploy myweb
...
    spec:
      volumes:
      - name: cmvol
        configMap:
          name: myindex
      containers:
        volumeMounts:
        - mountPath: /usr/share/nginx/html
          name: cmvol
      - image: nginx
        imagePullPolicy: Always
        name: nginx
        resources: {}
...
```

Let's verify our changes:
```
student@minikube:~$ kubectl describe deploy myweb
Pod Template:
  Labels:  app=myweb
  Containers:
   nginx:
    Image:        nginx
    Port:         <none>
    Host Port:    <none>
    Environment:  <none>
    Mounts:
      /usr/share/nginx/html from cmvol (rw)
  Volumes:
   cmvol:
    Type:      ConfigMap (a volume populated by a ConfigMap)
    Name:      myindex
...

student@minikube:~$ kubectl get all --selector app=myweb
NAME                        READY   STATUS    RESTARTS   AGE
pod/myweb-ff8bf9988-287n2   1/1     Running   0          13m

NAME                    READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/myweb   1/1     1            1           19m

NAME                              DESIRED   CURRENT   READY   AGE
replicaset.apps/myweb-8764bf4c8   0         0         0       19m
replicaset.apps/myweb-ff8bf9988   1         1         1       13m

student@minikube:~$ kubectl exec pod/myweb-ff8bf9988-287n2 -- cat /usr/share/nginx/html/index.html
Hello World!
```


## Understanding Secrets
Secrets allow you to store sensitive data such as passwords, authentication tokens and SSH keys, outside of a Pod to reduce the risk of accidental expose. Some Secrets are automatically created by Kubernetes while others can be created by the user. System-created Secrets are important for Kubernetes resources to connect to other cluster resources.

> Secrets are Base64 encoded and not encrypted.

Three types of Secret types are offered:
* `docker-registry`: Used for connecting to a Docker registry.
* `TLS`: Used to store TLS key material.
* `generic:` Creates a secret from a local file, directory or literal value

You need to specify the type when defining the Secret:
`kubectl create secret generic ...`

### How Kubernetes Uses Secrets
All Kubernetes resources need access to TLS keys in order to access the Kubernetes API. These keys are provided by Secrets and used through ServiceAccounts. By using the ServiceAccount, the application has access to its Secret.

Let's inspect one of the secrets Kubernetes uses.
As mentioned previously, Secrets are used through ServiceAccounts, so we need to find out the ServiceAccount first before we can inspect the details of the Secret:
```
student@minikube:~$ kubectl get pods -n kube-system
NAME                               READY   STATUS    RESTARTS        AGE
coredns-64897985d-lhqq6            1/1     Running   1 (6m49s ago)   25m
etcd-minikube                      1/1     Running   1 (6m49s ago)   25m
kube-apiserver-minikube            1/1     Running   1 (6m49s ago)   25m
kube-controller-manager-minikube   1/1     Running   1 (6m49s ago)   25m
kube-proxy-khgjl                   1/1     Running   1 (6m49s ago)   25m
kube-scheduler-minikube            1/1     Running   1 (6m49s ago)   25m
storage-provisioner                1/1     Running   2 (6m49s ago)   25m

student@minikube:~$ kubectl get pods -n kube-system coredns-64897985d-lhqq6 -o yaml | grep serviceAccount
  serviceAccount: coredns
  serviceAccountName: coredns
      - serviceAccountToken:

student@minikube:~$ kubectl get sa -n kube-system coredns -o yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  creationTimestamp: "2022-02-01T15:48:54Z"
  name: coredns
  namespace: kube-system
  resourceVersion: "299"
  uid: 519a806e-35c0-45be-a5a0-495d9f7c7586
secrets:
- name: coredns-token-j6qdj

student@minikube:~$ kubectl get secret -n kube-system coredns-token-j6qdj -o yaml
apiVersion: v1
data:
  ca.crt: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCakNDQWU2Z0F3SUJBZ0lCQVRBTkJna3Foa2lHOXcwQkFRc0ZBREFWTVJNd0VRWURWUVFERXdwdGFXNXAKYTNWaVpVTkJNQjRYRFRJeU1ETXdOekUxTlRrd05Wb1hEVE15TURNd05URTFOVGt3TlZvd0ZURVRNQkVHQTFVRQpBeE1LYldsdWFXdDFZbVZEUVRDQ0FTSXdEUVlKS29aSWh2Y05BUUVCQlFBRGdnRVBBRENDQVFvQ2dnRUJBS0pDCnhPam5XYXRKSW9tdUcrSGtsM3J0aFhGV0NwUGhic3FXTkhsbGlqeTlWWVRvYlYwdHVrUW1sRkRvZGc2N1RULzQKWmlYNVFvUXdyV0NOSTYrYmtPMGpGMUhPRXJQNUF2S3ZJMEpabzliSTZzN1NPVmVsNHJsRGtRUGFScjBWajhrZwpGZTZNb2tUZGswQlBmQ1l5c2hhNmNBUGNaaHl1Wjl3clJRYi83dnZkS3BzZ2tLZ1ZOMmVEQnNqRzNGWFc1M2JvCkx6azJsT1NORHRxNndVSTdlZzIrNjR2UEQ5YkdWU09IU3JraVNMTVdtU3ZWL0d3SlV3dFd6YVhtZWhJZ1NLRVAKY3ZxMWtRN0dvUEVzTUF6TUtMb2F4bXdpZlUxQ0xISE93akhWTlZvVXcvVmNOQlZCOGlnRGd4cmJMSjg3bU9pOQpqbzJpck1BNTZqZExPVk1rUFlzQ0F3RUFBYU5oTUY4d0RnWURWUjBQQVFIL0JBUURBZ0trTUIwR0ExVWRKUVFXCk1CUUdDQ3NHQVFVRkJ3TUNCZ2dyQmdFRkJRY0RBVEFQQmdOVkhSTUJBZjhFQlRBREFRSC9NQjBHQTFVZERnUVcKQkJTODl5UHdEYzJxZG13VGFlbWxZcndvclRqVTdqQU5CZ2txaGtpRzl3MEJBUXNGQUFPQ0FRRUFlOTdNNjV3WQpxUU5nR2NzT3A4Tm4rbzdGdXQ0cWMyWldjdll5bEZKUnFURjFIVjhwZDIzTFR0V3VoRkQraVk5SDJuLzFNdzdwCnVFcHdVUjAzVHpIUUVpL1JjTUJPV0JBakFGVzJHck5RelhVbzdyOE03a3FHdEN3MVd4WXduQVBhNGJ1SG41SWcKT0lhQTA4V25udW4rcFFRMW5WL25aU04yV2xwRzRrblhGcHAzcjhTQ21uVkd1L296VjV3bGZ3WU9Ea3prZExSMgp4bjA5SHhTWkJsclpDdFZqWUxDaVRYbkN3Q3pTVXZSNjhYWkNZVWRWTHF5ZzZyZXBYb0dsSkJzY0ZMZURtKzZrCnVZR1ZvY0Ezd0FpWktoazJPV2EzcGdnTFJod2xTdTRqaFZZNk82WFpvQXMzOHcvYzFTeWY1WDBqcFB1OVdPRW8KSDdsTEpCOTdhamhYdVE9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
  namespace: a3ViZS1zeXN0ZW0=
  token: ZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNklsWlplWEJ4UkdoUVNUQnJaM1JTTjJGNVdUQTRlakJZUjBWS2VVaHdNRlJSYzFoQ1JFOXJPWGRGYmxFaWZRLmV5SnBjM01pT2lKcmRXSmxjbTVsZEdWekwzTmxjblpwWTJWaFkyTnZkVzUwSWl3aWEzVmlaWEp1WlhSbGN5NXBieTl6WlhKMmFXTmxZV05qYjNWdWRDOXVZVzFsYzNCaFkyVWlPaUpyZFdKbExYTjVjM1JsYlNJc0ltdDFZbVZ5Ym1WMFpYTXVhVzh2YzJWeWRtbGpaV0ZqWTI5MWJuUXZjMlZqY21WMExtNWhiV1VpT2lKamIzSmxaRzV6TFhSdmEyVnVMV28yY1dScUlpd2lhM1ZpWlhKdVpYUmxjeTVwYnk5elpYSjJhV05sWVdOamIzVnVkQzl6WlhKMmFXTmxMV0ZqWTI5MWJuUXVibUZ0WlNJNkltTnZjbVZrYm5NaUxDSnJkV0psY201bGRHVnpMbWx2TDNObGNuWnBZMlZoWTJOdmRXNTBMM05sY25acFkyVXRZV05qYjNWdWRDNTFhV1FpT2lJMU1UbGhPREEyWlMwek5XTXdMVFExWW1VdFlUVmhNQzAwT1RWa09XWTNZemMxT0RZaUxDSnpkV0lpT2lKemVYTjBaVzA2YzJWeWRtbGpaV0ZqWTI5MWJuUTZhM1ZpWlMxemVYTjBaVzA2WTI5eVpXUnVjeUo5LmN6cGp6SUM5NG9jSV81N21vZU5wZ2xXLWtVZnpHdUlUUktfa09qbkw3M0xuN1p2M2tLMWU2TjNqbUpPSW95d2RMcms5NWNwZC1pT1VjQWdpQVcxN3dJRUZ1THR4WnVkbmsyNnBwWU1sdDNLWHpBMkJycjdkYzZGM0xjdG9RNTdPMEY0MnEybXpJS0dnVDBVYkhmYTNwTjd4ZDY0Zk04RVFpZUc2bEZBSlNuYjlBTGVqSjd6X1JjeWdkLU1SOE9Qc2gtd05KMW1RSlVrUktzenVwTHdZcERKSXVCSGx6a093Rm04YXJ5ODZ3Y0pGdzNSbm5mcFo4ZTF0aWwtWUVSTmV3aDdMdzhvTGRrSzJNUnVVSnBKZmtGZ1kteWhWejdwa3MtNW53U05BUWVpTEk2RG9oUFBqd3BYa3hzWWVCbUhZVWo1b3JMNlZ5NG9Xb1ZZTnJIU0JvUQ==
kind: Secret
metadata:
  annotations:
    kubernetes.io/service-account.name: coredns
    kubernetes.io/service-account.uid: 519a806e-35c0-45be-a5a0-495d9f7c7586
  creationTimestamp: "2022-02-01T15:48:55Z"
  name: coredns-token-j6qdj
  namespace: kube-system
  resourceVersion: "294"
  uid: d5b84f10-e6fa-46d0-92ec-2b7895a799eb
type: kubernetes.io/service-account-token
```
Notice how the values in the Secret Yaml output above are base64 encoded, e.g. for the `namespace`:
```
student@minikube:~$ echo a3ViZS1zeXN0ZW0= | base64 -d
kube-system
```

### Configuring Applications to Use Secrets
There are different use cases for using Secrets in applications:
* Providing TLS keys to the application:  
`kubectl create secret tls my-tls-keys --cert=pathto/my.crt --key=pathto/my.key`
* Provide security to passwords:  
`kubectl create generic my-secret-pw --from-literal=password=verysecret`
* Provide access to an SSH private key:  
`kubectl create generic my-ssh-key --from-file=ssh-private-key=.ssh/id_rsa`
* Provide access to sensitive files which would be mounted in the application with root access only:  
`kubectl create secret generic my-secret-file --from-file=/my/secretfile`

Secrets are used in a similar way to using ConfigMaps in applications:
* If your Secret contains variables (like a password), use `kubectl set env`.
* If it contains files (like keys), mount the Secret. Consider using `defaultMode: 0400` permissions when mounting the Secret in the Pod spec.

> Mounted Secrets are automatically updated in the application when the Secret is updated.

Let's demonstrate this:
```
student@minikube:~$ kubectl create secret generic dbpw --from-literal=ROOT_PASSWORD=password
secret/dbpw created

student@minikube:~$ kubectl describe secret dbpw
Name:         dbpw
Namespace:    default
Labels:       <none>
Annotations:  <none>

Type:  Opaque

Data
====
ROOT_PASSWORD:  8 bytes

student@minikube:~$ kubectl get secret dbpw -o yaml
apiVersion: v1
data:
  ROOT_PASSWORD: cGFzc3dvcmQ=
kind: Secret
metadata:
  creationTimestamp: "2022-02-01T16:30:07Z"
  name: dbpw
  namespace: default
  resourceVersion: "1661"
  uid: 6aff6adf-73e1-4ffd-b99a-fd036a034c6b
type: Opaque

student@minikube:~$ echo cGFzc3dvcmQ= | base64 -d
password
```

Now, let's deploy our Secret to an app:
```
student@minikube:~$ kubectl create deployment mynewdb --image=mariadb
deployment.apps/mynewdb created
```

Remember that `mariadb` is expecting at the very least a `MYSQL_ROOT_PASSWORD` environment variable. But since we created our Secret with `ROOT_PASSWORD` instead of `MYSQL_ROOT_PASSWORD` we would need to set a prefix when attaching the Secret to the application. This can come in handy in case I have other applications that could potentially use the same Secret.

```
student@minikube:~$ kubectl set env deployment mynewdb --from=secret/dbpw --prefix=MYSQL_
deployment.apps/mynewdb env updated
```

Now, while our password is base64 encoded, this isn't the case inside the Pod where it's in clear text:
```
student@minikube:~$ kubectl get pods
NAME                       READY   STATUS    RESTARTS   AGE
mynewdb-7cc5fb9c55-58wkz   1/1     Running   0          13m

student@minikube:~$ kubectl exec mynewdb-7cc5fb9c55-58wkz -- env
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
HOSTNAME=mynewdb-7cc5fb9c55-58wkz
MYSQL_ROOT_PASSWORD=password
```

### Configuring Docker Registry Access Secret
The `docker-registry` Secret type stores container registry (Docker Hub, Quay.io, self hosted, ...) authentication credentials. While you don't *need* to authenticate, it's recommended to prevent pull rate errors in case you're running a busy cluster.

There's two ways to create the Secret: Either by directly passing the credentials, or by passing an existing Docker Config file which contains the credentials:
```
student@minikube:~$ kubectl create secret docker-registry -h
Examples:
  # If you don't already have a .dockercfg file, you can create a dockercfg secret directly by using:
  kubectl create secret docker-registry my-secret --docker-server=DOCKER_REGISTRY_SERVER --docker-username=DOCKER_USER
--docker-password=DOCKER_PASSWORD --docker-email=DOCKER_EMAIL
  
  # Create a new secret named my-secret from ~/.docker/config.json
  kubectl create secret docker-registry my-secret --from-file=.dockerconfigjson=path/to/.docker/config.json
```
