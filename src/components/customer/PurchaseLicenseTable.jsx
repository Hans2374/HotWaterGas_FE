import SteamKeyCell from './SteamKeyCell';
import './PurchaseLicenseTable.css';

/**
 * PurchaseLicenseTable - Displays table of Steam keys for an order
 * 
 * Shows licenses only when order is in a fulfillment state (Paid/Fulfilled)
 */
export default function PurchaseLicenseTable({ licenses }) {
  if (!licenses || licenses.length === 0) {
    return (
      <div className="license-table-empty">
        <p>Không có key bản quyền cho đơn hàng này.</p>
      </div>
    );
  }

  return (
    <div className="license-table-container">
      <table className="license-table">
        <thead>
          <tr>
            <th>Sản phẩm</th>
            <th>Thông tin key</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {licenses.map((license, index) => (
            <tr key={index}>
              <td className="product-col">
                <div className="product-name">{license.productName}</div>
              </td>
              <td className="key-col">
                <SteamKeyCell
                  productName={license.productName}
                  keyValue={license.keyValue}
                  redemptionGuideUrl={license.redemptionGuideUrl}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
