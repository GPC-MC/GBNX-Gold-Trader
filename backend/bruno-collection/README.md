# GBNX Gold Trader Backend - Bruno API Collection

This is a Bruno API collection for testing the GBNX Gold Trader backend endpoints.

## What is Bruno?

Bruno is a fast and Git-friendly open-source API client, similar to Postman but with better version control integration.

Download: https://www.usebruno.com/

## Collection Structure

```
bruno-collection/
├── bruno.json                  # Collection metadata
├── environments/               # Environment configurations
│   ├── Development.bru        # Localhost configuration
│   └── Production.bru         # Production server configuration
├── Pricing/                   # Price data endpoints
│   ├── Get Gold OHLC.bru
│   ├── Get Silver OHLC.bru
│   ├── Get Platinum OHLC.bru
│   ├── Get SGD OHLC.bru
│   ├── Get MYR OHLC.bru
│   ├── Get OHLC by Trading Pair.bru
│   └── Get Active Streams.bru
├── Transactions/              # Transaction endpoints
│   ├── Get Gold Price.bru
│   ├── Buy Gold.bru
│   ├── Sell Gold.bru
│   ├── Get All Balances.bru
│   └── Get Balance by Account.bru
├── Market/                    # Market data endpoints
│   ├── Get Latest News.bru
│   ├── Get LiveChart Data.bru
│   └── Analyze Sentiment.bru
└── Health Check.bru           # Health check endpoint
```

## Environments

### Development
- **Base URL**: `http://localhost:8081`
- **WebSocket URL**: `ws://localhost:8081`
- Use this when running the backend locally

### Production
- **Base URL**: `http://34.41.9.244:8081`
- **WebSocket URL**: `ws://34.41.9.244:8081`
- Use this for testing the deployed production server

## How to Use

### 1. Install Bruno
Download and install Bruno from: https://www.usebruno.com/

### 2. Open the Collection
1. Open Bruno
2. Click "Open Collection"
3. Navigate to: `backend/bruno-collection`
4. Select the folder

### 3. Select Environment
1. Click on the environment dropdown (top right)
2. Select either "Development" or "Production"

### 4. Run Requests
1. Browse the folders on the left sidebar
2. Click on any endpoint
3. Click "Send" to make the request
4. View the response

## Available Endpoints

### Pricing API (`/api/pricing`)
- **GET** `/api/pricing/ohlc/gold` - Get gold OHLC data
- **GET** `/api/pricing/ohlc/silver` - Get silver OHLC data
- **GET** `/api/pricing/ohlc/platinum` - Get platinum OHLC data
- **GET** `/api/pricing/ohlc/sgd` - Get SGD exchange rate data
- **GET** `/api/pricing/ohlc/myr` - Get MYR exchange rate data
- **GET** `/api/pricing/ohlc/{trading_pair}` - Get OHLC for any trading pair
- **GET** `/api/pricing/ws/active-streams` - Get active WebSocket streams info

### Transactions API (`/transactions`)
- **GET** `/transactions/gold-price` - Get current gold price
- **POST** `/transactions/buy` - Create buy transaction
- **POST** `/transactions/sell` - Create sell transaction
- **GET** `/transactions/balances` - Get all account balances
- **GET** `/transactions/balance/{account_name}` - Get specific account balance

### Market API
- **POST** `/latest_news` - Get latest news by keyword
- **POST** `/livechart_data` - Get live chart data with technical indicators
- **POST** `/analyze_sentiment` - Analyze market sentiment from text

### General
- **GET** `/` - Health check endpoint

## Query Parameters

Most OHLC endpoints support these parameters:
- `interval`: Time interval in seconds (default: 3600)
- `limit`: Number of data points (default: 50, max: 1000)
- `offset`: Pagination offset (default: 0)
- `sort`: Sort order - "asc" or "desc" (default: "desc")

## WebSocket Endpoints

For WebSocket testing, you can use Bruno or other tools:

### Single Price Feed
```
ws://localhost:8081/api/pricing/ws/ticks/XAU/USD
```

### Multi Price Feed
```
ws://localhost:8081/api/pricing/ws/multi
```

Send messages:
```json
// Subscribe
{"action": "subscribe", "symbol": "XAU/USD"}

// Unsubscribe
{"action": "unsubscribe", "symbol": "XAU/USD"}
```

## Running Tests

Many endpoints include automated tests. After sending a request:
1. Click on the "Tests" tab
2. View test results (pass/fail)

Example tests:
- Status code validation
- Response structure validation
- Data type validation

## Tips

1. **Environment Variables**: The collection uses `{{base_url}}` variable which automatically changes based on selected environment

2. **Quick Testing**: Use keyboard shortcuts:
   - `Cmd/Ctrl + Enter`: Send request
   - `Cmd/Ctrl + S`: Save request

3. **Collections as Code**: All `.bru` files are plain text and can be version controlled with Git

4. **Organize**: Requests are organized in folders matching the API structure

## Troubleshooting

### Connection Refused
- Make sure the backend server is running
- Check the correct environment is selected
- Verify the port number (8081)

### 404 Not Found
- Verify the endpoint path is correct
- Check if the router is properly registered in main.py

### 500 Internal Server Error
- Check server logs: `docker logs -f gbnx_gold_trader_backend`
- Verify request body format for POST requests
- Check if required dependencies are installed

## Adding New Endpoints

To add a new endpoint:
1. Create a new `.bru` file in the appropriate folder
2. Use existing files as templates
3. Update the `seq` number for ordering
4. Add documentation in the `docs` section
5. Add tests in the `tests` section

## Example .bru File Structure

```
meta {
  name: Endpoint Name
  type: http
  seq: 1
}

get {
  url: {{base_url}}/path
  body: none
  auth: none
}

params:query {
  param1: value1
  param2: value2
}

docs {
  Description of the endpoint
}

tests {
  test("Test name", function() {
    expect(res.getStatus()).to.equal(200);
  });
}
```

## Contributing

When adding new endpoints to the backend:
1. Add corresponding `.bru` file to this collection
2. Include documentation and tests
3. Update this README if needed
4. Commit the `.bru` files with your code changes
