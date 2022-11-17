import React, { useEffect, useState } from "react";
import { DeviceInput } from "./UrlInput";

export const AppWrapper = () => {
  const [url, setUrl] = useState("");
  const [client, setClient] = useState(undefined);

  useEffect(() => {
    if (url.length > 0) {
      setClient(W3CWebSocket(url));
    }
  }, [url]);

  if (client) {
    return <App client={client} />;
  } else {
    return <DeviceInput onSubmit={(url) => setUrl(url)} />;
  }
};

var W3CWebSocket = require("websocket").w3cwebsocket;

const commands = {
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
  StatusNotification: [
    "2",
    new Date().getMilliseconds(),
    "StatusNotification",
    {
      connectorId: 1,
      errorCode: "NoError",
      info: "NoError",
      status: "Available",
      timestamp: new Date().toISOString(),
      vendorId: "Felix McCuaig",
      vendorErrorCode: "0",
    },
  ],
};

const CONNECTOR_STATUS = [
  "Available",
  "Preparing",
  "Charging",
  "SuspendedEV",
  "SuspendedEVSE",
  "Finishing",
  "Reserved",
  "Unavailable",
  "Faulted",
];

const App = ({ client }) => {
  const [connectionStatus, updateConnectionStatus] = useState(false);
  const [connectors, updateConnectors] = useState([
    {
      id: 1,
      status: "Available",
      errorCode: "NoError",
      transactionId: undefined,
      metervalue: 0,
      pendingCommands: [],
    },
    {
      id: 2,
      status: "Available",
      errorCode: "NoError",
      transactionId: undefined,
      metervalue: 0,
      pendingCommands: [],
    },
  ]);
  const [pendingCommands, updatePendingCommands] = useState([]);
  const [lines, updateLines] = useState([]);

  client.onerror = () => {
    console.log("Connection Error");
  };

  client.onopen = () => {
    updateConnectionStatus(true);
  };

  client.onclose = () => {
    updateConnectionStatus(false);
  };

  client.onmessage = (e) => {
    var message = e.data;
    updateLines([...lines, message]);

    console.log(message);

    try {
      var [messageTypeId, uniqueId, payload] = JSON.parse(message);
    } catch (err) {
      console.err(`Err occurred ${err}`);
      return;
    }

    if (messageTypeId === 3) {
      console.log(pendingCommands, "pending commands");
      var pendingCommand = pendingCommands.find((x) => x.id === uniqueId);
      if (pendingCommand) {
        if (pendingCommand.type === "StartTransaction") {
          var transactionId = payload.transactionId;
          var connectorStateIndex = connectors.findIndex(
            (x) => x.id === pendingCommand.payload.connectorId
          );
          var connTemp = [...connectors];
          connTemp[connectorStateIndex].transactionId = transactionId;
          updateConnectors(connTemp);
        }
      }
    } else if (messageTypeId === 2) {
      //Command from server
      try {
        var [messageTypeId, uniqueId, action, payload] = JSON.parse(message);

        switch (action) {
          case "RemoteStartTransaction": {
            //Send the reply, then the starttransrequest.
            client.send(JSON.stringify([3, uniqueId, { status: "Accepted" }]));

            var connector_id = payload.connectorId;
            var idTag = payload.idTag;

            console.log(`Connector Id`, connector_id);

            var packet = [
              "2",
              new Date().getMilliseconds(),
              "StartTransaction",
              {
                connectorId: connector_id,
                idTag: idTag,
                meterStart: 0,
                timestamp: new Date().toISOString(),
              },
            ];

            var tempPendingCommands = [...pendingCommands];
            tempPendingCommands.push({
              id: packet[1],
              type: packet[2],
              payload: packet[3],
            });
            updatePendingCommands(tempPendingCommands);

            client.send(JSON.stringify(packet));

            break;
          }
          case "RemoteStopTransaction": {
            //reply and send stoptransrequest
            client.send(JSON.stringify([3, uniqueId, { status: "Accepted" }]));

            var transactionId = payload.transactionId;

            var connectorStateIndex = connectors.findIndex(
              (x) => x.transactionId === transactionId
            );

            if (connectorStateIndex === -1) {
              console.log("Breaking, connectorStateIndex");
              break;
            }

            var state = connectors[connectorStateIndex];

            if (!state.transactionId) {
              console.log("Breaking");
              break;
            }

            var packet = [
              "2",
              new Date().getMilliseconds(),
              "StopTransaction",
              {
                idTag: "TEST",
                meterStop: state.metervalue,
                timestamp: new Date().toISOString(),
                transactionId: state.transactionId,
              },
            ];

            var tempPendingCommands = [...pendingCommands];
            tempPendingCommands.push({
              id: packet[1],
              type: packet[2],
              payload: packet[3],
            });
            updatePendingCommands(tempPendingCommands);

            client.send(JSON.stringify(packet));

            var tempConnectors = [...connectors];
            tempConnectors[connectorStateIndex].transactionId = undefined;
            updateConnectors(tempConnectors);

            break;
          }
          case "ChangeAvailability": {
            break;
          }
        }
      } catch (err) {
        console.log(`Error parsing command from server: ${err}`);
      }
    } else {
    }
  };

  return (
    <div className="m-2">
      <h1 className="text-4xl">
        OCPP Simulator{" "}
        {connectionStatus === true ? "Connected" : "Not Connected"}
      </h1>
      <DeviceControls
        client={client}
        bootnotification={() => {
          client.send(
            JSON.stringify([
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
            ])
          );
        }}
        heartbeat={() => {}}
        authorize={() => {}}
      />
      <h1>Connector Manager</h1>
      <div className="border rounded p-2">
        {connectors.map((x) => (
          <Connector
            key={x.id}
            data={x}
            onUpdate={(state, type) => {
              var tempConnectors = [...connectors];
              var stateIndex = tempConnectors.findIndex(
                (x) => x.id === state.id
              );
              tempConnectors[stateIndex] = state;
              updateConnectors(tempConnectors);
              console.log(`Updated connectors`);

              if (type === "connector") {
                //Send a status notification with new state
                client.send(
                  JSON.stringify([
                    "2",
                    new Date().getMilliseconds(),
                    "StatusNotification",
                    {
                      connectorId: state.id,
                      errorCode: state.errorCode,
                      info: "NoError",
                      status: state.status,
                      timestamp: new Date().toISOString(),
                      vendorId: "Felix McCuaig",
                      vendorErrorCode: "0",
                    },
                  ])
                );
              } else if (type === "metervalues") {
                var metervalue = {
                  connectorId: state.id,
                  transactionId: state.transactionId,
                  meterValue: [
                    {
                      timestamp: new Date().toISOString(),
                      sampledValue: [
                        {
                          value: state.metervalue,
                          measurand: "Energy.Active.Import.Register",
                          format: "Raw",
                          context: "Sample.Periodic",
                        },
                      ],
                    },
                  ],
                };
                client.send(
                  JSON.stringify([
                    "2",
                    new Date().getMilliseconds(),
                    "MeterValues",
                    metervalue,
                  ])
                );
              }
            }}
            startTransaction={() => {
              var packet = [
                "2",
                new Date().getMilliseconds(),
                "StartTransaction",
                {
                  connectorId: x.id,
                  idTag: "TEST",
                  meterStart: 0,
                  timestamp: new Date().toISOString(),
                },
              ];

              var tempPendingCommands = [...pendingCommands];
              tempPendingCommands.push({
                id: packet[1],
                type: packet[2],
                payload: packet[3],
              });
              updatePendingCommands(tempPendingCommands);

              client.send(JSON.stringify(packet));
            }}
            stopTransaction={() => {
              var packet = [
                "2",
                new Date().getMilliseconds(),
                "StopTransaction",
                {
                  idTag: "TEST",
                  meterStop: x.metervalue,
                  timestamp: new Date().toISOString(),
                  transactionId: x.transactionId,
                },
              ];

              var tempPendingCommands = [...pendingCommands];
              tempPendingCommands.push({
                id: packet[1],
                type: packet[2],
                payload: packet[3],
              });
              updatePendingCommands(tempPendingCommands);

              client.send(JSON.stringify(packet));

              var tempConnectors = [...connectors];
              var connectorIndex = tempConnectors.findIndex(
                (y) => y.id === x.id
              );
              tempConnectors[connectorIndex].transactionId = undefined;
              updateConnectors(tempConnectors);
            }}
          />
        ))}
        <div>
          <button
            className="bg-blue-400 text-white text-sm font-bold py-2 px-4 rounded"
            onClick={() => {
              var newConnector = {
                id: connectors.length + 1,
                status: "Available",
                errorCode: "NoError",
                transactionId: undefined,
                metervalue: 0,
                pendingCommands: [],
              };

              updateConnectors([...connectors, newConnector]);
            }}
          >
            Add Connector
          </button>
        </div>
      </div>
      <Terminal lines={lines} />
    </div>
  );
};

function DeviceControls({ heartbeat, authorize, bootnotification }) {
  return (
    <div className="mt-2">
      <h1 className="text-4xl">Device Controls</h1>
      <DeviceControl name="Bootnotification" onClick={bootnotification} />
      <DeviceControl name="Heartbeat" onClick={heartbeat} />
      <DeviceControl name="Authorize" onClick={authorize} />
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

const Connector = ({ data, onUpdate, startTransaction, stopTransaction }) => {
  const [meterValue, updateMeterValue] = useState(data.metervalue);
  const [transactionIdOverride, updateTransactionIdOverride] =
    useState(undefined);

  return (
    <div key={data.id} className="pb-2">
      <h1>ID: {data.id}</h1>
      <h1>Status: {data.status}</h1>
      <h1>ErrorCode: {data.errorCode}</h1>
      <h1>TransactionID: {data.transactionId}</h1>
      <h1>Metervalue (wH): {meterValue}</h1>
      <div className="pb-2">
        <button
          onClick={() => startTransaction()}
          className="bg-blue-400 text-white text-sm font-bold py-2 px-4 rounded"
        >
          Start Transaction
        </button>
        <button
          onClick={() => stopTransaction()}
          className="ml-2 bg-blue-400 text-white text-sm font-bold py-2 px-4 rounded"
        >
          Stop Transaction
        </button>
      </div>
      <div className="flex flex-row m-2">
        <h1>Meter value:</h1>
        <input
          onChange={(e) => updateMeterValue(Number.parseFloat(e.target.value))}
          type="number"
          className="border rounded ml-2"
        />
        <button
          className="ml-2 bg-blue-400 text-white text-sm font-bold py-2 px-4 rounded"
          onClick={() =>
            onUpdate({ ...data, metervalue: meterValue }, "metervalues")
          }
        >
          Metervalue update
        </button>
      </div>
      <div className="flex flex-row m-2">
        <h1>Transaction ID:</h1>
        <input
          onChange={(e) =>
            updateTransactionIdOverride(Number.parseFloat(e.target.value))
          }
          type="number"
          className="border rounded ml-2"
        />
        <button
          className="ml-2 bg-blue-400 text-white text-sm font-bold py-2 px-4 rounded"
          onClick={() =>
            onUpdate(
              { ...data, transactionId: transactionIdOverride },
              "transactionId"
            )
          }
        >
          Update Transaction ID
        </button>
      </div>
      <div className="flex flex-row m-2">
        <h1>Status Update:</h1>
        <select
          value={data.status}
          onChange={(e) =>
            onUpdate({ ...data, status: e.target.value }, "connector")
          }
          className="border rounded ml-2"
        >
          {CONNECTOR_STATUS.map((x) => (
            <option key={x} label={x} value={x} />
          ))}
        </select>
      </div>
      <hr />
    </div>
  );
};

const Terminal = ({ lines, lineEntered }) => {
  return (
    <div>
      <h1>Terminal</h1>
      {lines.map((x, i) => (
        <p key={i}>{x}</p>
      ))}
    </div>
  );
};

export default App;
