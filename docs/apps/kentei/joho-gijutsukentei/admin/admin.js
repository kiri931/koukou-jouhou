import { getAuthEmail, getAuthMeta, clearAuthSession } from "../../../../assets/js/auth/admin-auth.js";

const user = document.getElementById("user");
const provider = document.getElementById("provider");

user.textContent = getAuthEmail() || "-";
provider.textContent = getAuthMeta()?.provider || "-";

document.getElementById("logout").addEventListener("click", () => {
  clearAuthSession();
  location.href = "../";
});
