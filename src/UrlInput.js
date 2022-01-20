import { useState } from "react";

const DEFAULT_URL = "ws://localhost:8080/testpointid";

export const DeviceInput = ({ onSubmit }) => {
  const [currentUrl, setUrl] = useState(DEFAULT_URL);

  return (
    <div className="border rounded mt-2 flex">
      <div className="m-2">
        <h1>WS OCPP URL</h1>
        <div className="flex flex-row">
          <input
            className="border-2 rounded p-2 border-solid"
            defaultValue={DEFAULT_URL}
            onChange={(e) => setUrl(e.target.value)}
          />
          <h1 className="ml-2">Current URL: {currentUrl}</h1>
        </div>
      </div>

      <button
        className="ml-auto bg-blue-400 text-white text-sm font-bold py-2 px-4 rounded m-2"
        onClick={() => {
          var wsUrl = currentUrl;
          var websocket = /^(wss?:\/\/).*$/.test(wsUrl);

          if (!websocket) {
            alert("Please input a valid WEBSOCKET URL");
            return;
          }
          onSubmit(wsUrl);
        }}
      >
        Connect
      </button>
    </div>
  );
};
