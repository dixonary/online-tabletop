import Manager from "./Manager";
import he from "he";

class JoinRequests extends Manager {
  static _root: HTMLElement;
  static _elem: HTMLDivElement;

  static Initialize(root: HTMLElement) {
    super.Initialize();
    JoinRequests._elem = document.createElement("div") as HTMLDivElement;
    JoinRequests._elem.classList.add("join-requests");
    root.appendChild(JoinRequests._elem);
  }

  static Dispose() {
    super.Dispose();
    JoinRequests._root.removeChild(JoinRequests._elem);
  }

  /**
   * A join request has been received; add it to the overlay.
   * @param userName The user who wishes to join.
   * @param accept Accept the request.
   * @param reject Reject the request.
   */
  static Add(
    userName: string,
    nonce: string,
    sendResponse: (r: boolean) => void
  ) {
    const req = document.createElement("div") as HTMLDivElement;
    req.classList.add("join-request");

    (window as any)[`jr_${nonce}`] = (r: boolean) => {
      JoinRequests._elem.removeChild(req);
      sendResponse(r);
      delete (window as any)[`jr_${nonce}`];
    };

    console.log(`jr_${nonce}`);

    const escapedUsername = he.escape(userName);

    const jr = `<p>${escapedUsername} would like to join the game.</p>
      <div class="response-buttons">
      <button class='button button-success' onclick="jr_${nonce}(true)">Accept</button>
      <button class='button button-danger' onclick="jr_${nonce}(false)">Reject</button>
      </div>
      `;

    req.innerHTML = jr;

    JoinRequests._elem.appendChild(req);
  }
}

export default JoinRequests;
