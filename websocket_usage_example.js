
function CexSocketTicker(callback)
{
	var ws_path = 'wss://ws.cex.io/ws',
		_this = this,
		connected = false,
		socket,
		last_md,
		last_md_grouped;

	this.run = function(){

    	socket && socket.close();
    	socket = new WebSocket(ws_path);
    	socket.onerror = this.reconnect;
    	socket.onclose = this.reconnect;
    	socket.onopen = this.onOpen;
    	socket.onmessage = this.onMessage;
	};

	this.onOpen = function(){
		connected = true;

        socket.send(JSON.stringify({
            e: "subscribe",
            rooms: ["tickers", "pair-GHS-BTC"]
        }))
	};

	this.reconnect = function(){
	    console.debug(this);

	    this.onerror = null;
	    this.onclose = null;
	    _this.connected = false;

	    setTimeout(function () {
	        _this.run();
	    }, 2e3)
	};

	this.onTick = function(){

		if(last_md && last_md_grouped)
		{
			callback({
				highest_bid: last_md.buy[0][0],
				lowest_ask: last_md.sell[0][0],
				bids: last_md.buy.concat(last_md_grouped.bids),
				asks: last_md.sell.concat(last_md_grouped.asks)
			});
		}

	}

	this.onMd = function(data){
		last_md = data;

		for (i = 0; i < last_md.buy.length; i++) 
		{
			last_md.buy[i][0] = parseFloat(last_md.buy[i][0]);
			last_md.buy[i][1] = parseFloat((parseInt(last_md.buy[i][1])/1e8).toFixed(8));
		}

		for (i = 0; i < last_md.sell.length; i++) 
		{
			last_md.sell[i][0] = parseFloat(last_md.sell[i][0]);
			last_md.sell[i][1] = parseFloat((parseInt(last_md.sell[i][1])/1e8).toFixed(8));
		}

		this.onTick();
	}

	this.onMdGrouped = function(data){
		last_md_grouped = data;
		last_md_grouped.bids = [];
		last_md_grouped.asks = [];

// console.debug(last_md_grouped);
		$.each(last_md_grouped.buy, function (k, v) {

			var price = parseFloat(k),
				amount = parseFloat((parseInt(v)/1e8).toFixed(8));

            if(!isNaN(amount)) last_md_grouped.bids.push([price, amount]);
            else console.debug(k, v);
        });

		$.each(last_md_grouped.sell, function (k, v) {

			var price = parseFloat(k),
				amount = parseFloat((parseInt(v)/1e8).toFixed(8));

            if(!isNaN(amount)) last_md_grouped.asks.push([price, amount]);
            else console.debug(k, v);
        });

		this.onTick();
	}

	this.onMessage = function(e){
		var t;

	    try {
	        t = JSON.parse(e.data)
	    } catch (i) {
	        return
	    }

	    switch (t.e) {
	    	//ignore following events
		    case "history":
		    case "history-update":
		    case "ohlcv24":
		    case "ohlcv":
		    case "ohlcv-init":
		    case "online":
		    break;

		    //catch GHS-BTC tick
		    case "tick":
		    	if(t.data.symbol1 == 'GHS' && t.data.symbol2 == 'BTC')
		    	{
	    			console.debug(t.e, t.data);
		    	}
		    break;

		    //catch and print interesting messages to console
		    case "md_groupped":
		    case "md":
		    case "orders":
		    case "order":
		    case "balance":
		    case "connected":
		    case "tx":
		    case "deposit":
		    case "init":
		    case "message":
	    		console.debug(t.e, t.data, t);
	    }

	    switch (t.e) 
	    {
		    case "md":
		        _this.onMd(t.data);
		        break;
		    case "md_groupped":
		        _this.onMdGrouped(t.data);
		        break;
	    }
	};

	this.run();
}

var ticker = new CexSocketTicker(function(highest_bid, lowest_ask, bids, asks){

	//do calculations ... or display them .. whatever you want
	//e.g. $('#highest_bid').text(highest_bid);
	
});
