import React, { useState, useEffect } from "react";

import { DeviceInput } from "./UrlInput";
import { Terminal } from "./CommandLine";

var W3CWebSocket = require("websocket").w3cwebsocket;

const commands = {
  BootNotification: [
    "2",
    new Date().getMilliseconds(),
    "BootNotification",
    {
      chargePointModel: "Virtual Test Device",
      chargePointSerialNumber: "testPointId",
      chargePointVendor: "Felix McCuaig",
      firmwareVersion: "v1.0",
      meterSerialNumber: "20200097",
      meterType: "Test Meter type",
    },
  ],
  Heartbeat: ["2", new Date().getMilliseconds(), "Heartbeat", {}],
  StartTransaction: [
    "2",
    new Date().getMilliseconds(),
    "StartTransaction",
    {
      connectorId: "1",
      idTag: "5tLBYXnPb4wCePZuUy3B",
      meterStart: 0,
      //"reservationId": "",
      timestamp: new Date().toISOString(),
    },
  ],
  StopTransaction: [
    "2",
    new Date().getMilliseconds(),
    "StopTransaction",
    {
      idTag: "5tLBYXnPb4wCePZuUy3B",
      meterStop: 2000,
      timestamp: new Date().toISOString(),
      transactionId: "",
      //"reason": "",
      //"transactionData": ""
    },
  ],
  Authorize: [
    "2",
    new Date().getMilliseconds(),
    "Authorize",
    {
      idTag: "5tLBYXnPb4wCePZuUy3B",
    },
  ],
  StatusNotification: {
    connectorId: "",
    errorCode: "",
    info: "",
    status: "",
    timestamp: "",
    vendorId: "",
    vendorErrorCode: "",
  },
  MeterValues: {
    connectorId: "",
    transactionId: "",
    meterValue: "",
  },
};

const App = () => {
  const [connectionStatus, updateConnectionStatus] = useState(false);
  const [transactionId, setTransactionId] = useState(undefined);
  const [client, setClient] = useState(undefined);
  const [terminal, updateTerminal] = useState(["TEST"]);

  return (
    <div className="m-2">
      <h1 className="text-4xl">
        OCPP Simulator{" "}
        {connectionStatus === true ? "Connected" : "Not Connected"}
      </h1>
      <DeviceInput
        onSubmit={(url) => {
          var client = W3CWebSocket(url);

          setClient(client);

          client.onerror = () => {
            console.log("Connection Error");
          };

          client.onopen = () => {
            updateConnectionStatus(true);
            console.log("WebSocket Client Connected");
            var payload = JSON.stringify(commands["BootNotification"]);
            client.send(payload);
          };

          client.onclose = () => {
            updateConnectionStatus(false);
            console.log("echo-protocol Client Closed");
          };

          client.onmessage = (e) => {
            var message = e.data;
            updateTerminal(terminal.concat(message.toString()));
            console.log(e.data);

            try {
              var [messageTypeId, uniqueId, payload] = JSON.parse(message);
            } catch (err) {
              console.err(`Err occurred ${err}`);
              return;
            }

            if (messageTypeId === 2) {
              //Command from server
              try {
                var [messageTypeId, uniqueId, action, payload] =
                  JSON.parse(message);

                switch (action) {
                  case "RemoteStartTransaction": {
                    client.send(
                      JSON.stringify([3, uniqueId, { status: "Accepted" }])
                    );
                    var idTag = payload.idTag;
                    commands["StartTransaction"][3].idTag = idTag;
                    client.send(JSON.stringify(commands["StartTransaction"]));
                    break;
                  }
                  case "RemoteStopTransaction": {
                    client.send(
                      JSON.stringify([3, uniqueId, { status: "Accepted" }])
                    );
                    client.send(JSON.stringify(commands["StopTransaction"]));
                    break;
                  }
                }
              } catch (err) {
                console.log(`Error parsing command from server: ${err}`);
              }
            } else {
            }

            if (payload.transactionId) {
              setTransactionId(payload.transactionId);
            }
          };
        }}
      />
      <DeviceControls
        heartbeat={() => {
          client.send(JSON.stringify(commands["Heartbeat"]));
        }}
        startTransaction={() => {
          client.send(JSON.stringify(commands["StartTransaction"]));
        }}
        stopTransaction={() => {
          commands["StopTransaction"][3].transactionId = transactionId;
          commands["StopTransaction"][3].timestamp = new Date().toISOString();
          console.log(transactionId);
          client.send(JSON.stringify(commands["StopTransaction"]));
        }}
        authorize={() => {
          commands["Authorize"][3].idTag = "TESTCARD";
          client.send(JSON.stringify(commands["Authorize"]));
        }}
      />
      <Terminal lines={terminal.join(`\n`)} />
    </div>
  );
};

function DeviceControls({
  stopTransaction,
  startTransaction,
  meterValues,
  heartbeat,
  authorize,
  statusNotification,
}) {
  return (
    <div className="mt-2">
      <h1 className="text-4xl">Device Controls</h1>
      <DeviceControl name="StartTransaction" onClick={startTransaction} />
      <DeviceControl name="StopTransaction" onClick={stopTransaction} />
      <DeviceControl name="MeterValues" onClick={meterValues} />
      <DeviceControl name="Heartbeat" onClick={heartbeat} />
      <DeviceControl name="Authorize" onClick={authorize} />
      <DeviceControl name="StatusNotification" onClick={statusNotification} />
    </div>
  );
}

const DeviceControl = ({ name, onClick }) => {
  return (
    <div className="m-2 flex">
      <button
        onClick={onClick}
        className="bg-blue-400 text-white text-sm font-bold py-2 px-4 rounded"
      >
        {name}
      </button>
    </div>
  );
};

export default App;
