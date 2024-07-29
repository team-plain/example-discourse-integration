# Example Discourse → Plain Integration

This is a small node app which integrates [Discourse](https://discourse.org/) with [Plain](https://plain.com).

This creates a new support request for topics posted in Discourse. For every subsequent post, it creates a event in the Plain thread and moves the thread back to todo.

The idea is that this template can be adapted to how your Discourse community is organised and your ideal support workflow. For example, you could add specific thread labels based on Discourse categories, automatically set priorities, assignees and much more. 

If you'd like help getting this set up, just reach out to us via Plain or on help@plain.com.

## Set-up

### Step 1: Get API keys

To run this example you need to first collect two API keys, one for Plain and one for Discourse.

For Plain, you need the following permissions. These can be pasted on the create API key page in Plain's settings:

```
company:create,company:delete,company:edit,company:read,company:search,customer:create,customer:edit,customer:impersonate,customer:read,customer:search,customerGroupMembership:create,customerGroupMembership:delete,customerGroupMembership:read,customerTenantMembership:create,customerTenantMembership:delete,customerTenantMembership:read,label:create,label:delete,label:read,labelType:create,labelType:edit,labelType:read,threadEvent:create,threadField:create,threadField:delete,threadField:read,threadField:update,threadFieldSchema:read,tier:create,tier:delete,tier:edit,tier:read,tierMembership:create,tierMembership:delete,tierMembership:read,user:delete,user:read,userAvatar:edit,customerGroup:create,customerGroup:delete,customerGroup:edit,customerGroup:read,machineUser:read,note:create,note:delete,note:read,thread:assign,thread:create,thread:edit,thread:read,thread:reply,thread:search,thread:unassign,tenant:create,tenant:delete,tenant:edit,tenant:read,tenant:search,threadLink:read
```

For Discourse you need to generate an API key with a user level of "All Users" and a scope of "Read-only".

### Step 2: Run the example

To run this example:

1. `npm install`
1. `npm run build`
1. `PLAIN_API_KEY=XXX DISCOURSE_API_KEY=XXX npm run start`


### Step 3: Point your Discourse webhook to your running app

To do this, go to your discourse settings and create a webhook for the "Post is created" event. This should point directly to your running example (just `/` as the path).

If you are running this locally you may want to use ngrok to locally work on this.

---

Need help getting this set up or want a demo? Get in touch via Plain or email us on help@plain.com