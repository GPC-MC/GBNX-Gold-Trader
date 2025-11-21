For current APIs and Websockets. Here are the links.


OHLC Data API

Gold 

https://gpcintegral.southeastasia.cloudapp.azure.com/livechart/data/?trading_pairs=xau_usd&interval=3600&limit=50&offset=0&sort=desc

Silver 

https://gpcintegral.southeastasia.cloudapp.azure.com/livechart/data/?trading_pairs=xag_usd&interval=3600&limit=50&offset=0&sort=desc

Platinum

https://gpcintegral.southeastasia.cloudapp.azure.com/livechart/data/?trading_pairs=xpt_usd&interval=3600&limit=50&offset=0&sort=desc

SGD

https://gpcintegral.southeastasia.cloudapp.azure.com/livechart/data/?trading_pairs=usd_sgd&interval=3600&limit=50&offset=0&sort=desc

MYR

https://gpcintegral.southeastasia.cloudapp.azure.com/livechart/data/?trading_pairs=usd_myr&interval=3600&limit=50&offset=0&sort=desc


Live Price Data Websockets

wss://gpcintegral.southeastasia.cloudapp.azure.com/ws/ticks/?symbol=ticks:XAU/USD

wss://gpcintegral.southeastasia.cloudapp.azure.com/ws/ticks/?symbol=ticks:XAG/USD

wss://gpcintegral.southeastasia.cloudapp.azure.com/ws/ticks/?symbol=ticks:XPT/USD

wss://gpcintegral.southeastasia.cloudapp.azure.com/ws/ticks/?symbol=ticks:USD/SGD

wss://gpcintegral.southeastasia.cloudapp.azure.com/ws/ticks/?symbol=ticks:USD/MYR

## Access to the development environment and trace logs
For the first time you download the ssh key from the portal, you will need to set the permissions of the file to read-only for the owner. You can do this by running the following command in your terminal:

```bash
chmod 400 /path/to/your/private/key.pem
```

### Add the ssh key to your ssh-agent
To add the ssh key to your ssh-agent, you can use the following command:
```bash
ssh-add /path/to/your/private/key.pem
```

### Connect to the VM using SSH
You can connect to the VM using the following command:
```bash
ssh -i /path/to/your/private/key.pem username@vm-ip-address
```

### Accessing Trace Logs
The service is running in a docker container. You can access the trace logs by running the following command:
```bash
docker logs -f gold-trading-ai-dev
```

to tail the logs in real-time.
You can stop tailing the logs by pressing `Ctrl + C`.

## Triggering a new dev deployment
Go to https://github.com/GPC-GBNX/gold-trading-ai/actions/workflows/deploy-dev.yaml
and click on the "Run workflow" button. Select the branch you want to deploy and click on the "Run workflow" button.