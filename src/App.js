import React, { useState, useEffect } from 'react';
import { Formik, Form, Field } from 'formik';
var W3CWebSocket = require('websocket').w3cwebsocket;

const commands = {
    "BootNotification": [
      "2",
      new Date().getMilliseconds(),
      "BootNotification",
      {
        "chargePointModel": "Virtual Test Device",
        "chargePointSerialNumber": "testPointId",
        "chargePointVendor": "Felix McCuaig",
        "firmwareVersion": "v1.0",
        "meterSerialNumber": "20200097",
        "meterType": "Test Meter type"
        }
    ],
    "Heartbeat": [
        "2",
        new Date().getMilliseconds(),
        "Heartbeat",
        {}
    ],
    "StartTransaction": [
        "2",
        new Date().getMilliseconds(),
        "StartTransaction",
        {
            "connectorId": "1",
            "idTag": "5tLBYXnPb4wCePZuUy3B",
            "meterStart": 0,
            //"reservationId": "",
            "timestamp": new Date().toISOString()
        }
    ],
    "StopTransaction": [
        "2",
        new Date().getMilliseconds(),
        "StopTransaction",
        {
            "idTag": "5tLBYXnPb4wCePZuUy3B",
            "meterStop": 2000,
            "timestamp": new Date().toISOString(),
            "transactionId": "",
            //"reason": "",
            //"transactionData": ""
        }
    ],
    "Authorize": [
        "2",
        new Date().getMilliseconds(),
        "Authorize",
        {
            "idTag": "5tLBYXnPb4wCePZuUy3B",
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
    "MeterValues": {
        "connectorId": "",
        "transactionId": "",
        "meterValue": ""
    }
}

function App() {
    const [wsURL, setWSUrl] = useState("");
    const [transactionId, setTransactionId] = useState(undefined);
    const [client, setClient] = useState(undefined);

    useEffect(() => {
        if(wsURL) {
            var client = W3CWebSocket(wsURL);

            setClient(client);

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
                var message = e.data;

                try {
                    var [messageTypeId, uniqueId, payload] = JSON.parse(message);
                } catch (err) {
                    console.err(`Err occurred ${err}`);
                    return;
                }

                if(payload.transactionId) {
                    setTransactionId(payload.transactionId);
                }
                
                console.log(message);
            };
          }
    }, [wsURL]);

    return (
    <div className="m-2">
        <h1 className="text-4xl">OCPP Simulator</h1>
        <DeviceInput onSubmit={(url)=>setWSUrl(url)}/>
        <DeviceControls 
            heartbeat={() => {
                client.send(JSON.stringify(commands["Heartbeat"]))
            }}

            startTransaction={() => {
                client.send(JSON.stringify(commands["StartTransaction"]))
            }}

            stopTransaction={() => {
                commands["StopTransaction"][3].transactionId = transactionId;
                console.log(transactionId);
                client.send(JSON.stringify(commands["StopTransaction"]))
            }}

            authorize={() => {
                commands["Authorize"][3].idTag = "TESTCARD";
                client.send(JSON.stringify(commands["Authorize"]))
            }}
        />
    </div>
    );
}

function DeviceControls({ stopTransaction, startTransaction, meterValues, heartbeat, authorize, statusNotification}) {
    return (
        <div className="mt-2">
            <h1 className="text-4xl">Device Controls</h1>
            <DeviceControl name='StartTransaction' onClick={startTransaction} />
            <DeviceControl name='StopTransaction' onClick={stopTransaction} />
            <DeviceControl name='MeterValues' onClick={meterValues} />
            <DeviceControl name='Heartbeat' onClick={heartbeat} />
            <DeviceControl name='Authorize' onClick={authorize} />
            <DeviceControl name='StatusNotification' onClick={statusNotification} />
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

const DeviceControl = ({ name, onClick }) => {
    return (
        <div className="m-2 flex">
            <button onClick={onClick} className="bg-blue-400 text-white text-sm font-bold py-2 px-4 rounded">{ name }</button>
        </div>
    );
}

export default App;
