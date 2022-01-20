export const Terminal = ({ lines }) => {
  return (
    <div className="border rounded bg-gray">
      <pre>{lines}</pre>
    </div>
  );
};
