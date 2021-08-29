import React, { useState, useEffect } from 'react';
import { Formik, Form, Field } from 'formik';
var W3CWebSocket = require('websocket').w3cwebsocket;

const commands = {
    "BootNotification": [
      "2",
      new Date().getMilliseconds(),
      "BootNotification",
      {
        "chargePointModel": "AC_7KW_001",
        "chargePointSerialNumber": "022101000026JSS070KE3BAFF",
        "chargePointVendor": "LINCHR",
        "firmwareVersion": "V205B00D36",
        "meterSerialNumber": "20200097",
        "meterType": "PRO-1 MOD"
    }
    ],
    "StatusNotification": {
        "connectorId": "",
        "errorCode": "",
        "info": "",
        "status": "",
        "timestamp": "",
        "vendorId": "",
        "vendorErrorCode": ""
    },
    "Heartbeat": {

    },
    "StartTransaction": {
        "connectorId": "",
        "idTag": "",
        "meterStart": "",
        "reservationId": "",
        "timestamp": ""
    },
    "StopTransaction": {
        "idTag": "",
        "meterStop": "",
        "timestamp": "",
        "transactionId": "",
        "reason": "",
        "transactionData": ""
    },
    "MeterValues": {
        "connectorId": "",
        "transactionId": "",
        "meterValue": ""
    }
}

function App() {
    const [wsURL, setWSUrl] = useState("");

    useEffect(() => {
        if(wsURL) {
            var client = W3CWebSocket(wsURL);

            client.onerror = function() {
              console.log('Connection Error');
            };
          
            client.onopen = function() {
                console.log('WebSocket Client Connected');
                var payload = JSON.stringify(commands["BootNotification"]);
                client.send(payload)
            };
            
            client.onclose = function() {
                console.log('echo-protocol Client Closed');
            };
            
            client.onmessage = function(e) {
                if (typeof e.data === 'string') {
                    console.log("Received: '" + e.data + "'");
                }
            };
          }
    }, [wsURL]);

    return (
    <div className="m-2">
        <h1 className="text-4xl">OCPP Simulator</h1>
        <DeviceInput onSubmit={(url)=>setWSUrl(url)}/>
        <DeviceControls />
    </div>
    );
}

function DeviceControls() {
    return (
        <div className="mt-2">
            <h1 className="text-4xl">Device Controls</h1>
            <DeviceControl name='Test' />
        </div>
    );
}

function DeviceInput({ onSubmit }) {
    return (
        <div className="border rounded mt-2">
            <Formik
                initialValues={{
                    ws: "ws://localhost:8080/testpointid"
                }}
                onSubmit={fields => {
                    var wsUrl = fields.ws;
                    var websocket = /^(wss?:\/\/).*$/.test(wsUrl);

                    if(!websocket) {
                        alert("Please input a valid WEBSOCKET URL");
                        return;
                    }

                    onSubmit(wsUrl);
                }}
            >
                <Form>
                    <div className="flex">
                        <div className="m-2">
                            <h1>WS OCPP URL</h1>
                            <Field type="text" name="ws" className="border-2 rounded ml-1 width-1/2" />
                        </div>
                        <div className="ml-auto m-2 mt-4">
                            <button 
                                className="bg-blue-400 text-white text-sm font-bold py-2 px-4 rounded"
                                name="submit"
                                type="submit"
                            >
                                Connect
                            </button>
                        </div>
                    </div>
                </Form>
            </Formik>
        </div>
    );
}

const DeviceControl = ({ name }) => {
    return (
        <div className="m-2">
            <button className="bg-blue-400 text-white text-sm font-bold py-2 px-4 rounded">{ name }</button>
        </div>
    );
}

export default App;
