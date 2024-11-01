// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const clientId = urlParams.get("client_id");
const redirectUri = urlParams.get("redirect_uri");
const scope = urlParams.get("scope");
const state = urlParams.get("state");
const responseType = urlParams.get("response_type");

async function fastAuthCheck() {
   try {
      const response = await fetch("https://api.erzen.xyz/v1/auth/info", {
         method: "GET",
         credentials: "include",
      });
      return response.ok;
   } catch (error) {
      console.error("Error during fast auth check:", error);
      return false;
   }
}

async function redirectToLogin() {
   // Create the return URL with all OAuth parameters
   const currentUrl = new URL(window.location.href);
   const returnTo = encodeURIComponent(currentUrl.toString());

   // Redirect to login page with return_to parameter
   window.location.href = `https://auth.erzen.xyz/?return_to=${returnTo}`;
}

async function loadConsentScreen() {
   try {
      if (!clientId || !redirectUri || !scope || !state || !responseType) {
         // Send them back from where they came from
         // window.location.href = "https://auth.erzen.xyz";
      }
      // Get consent screen information using the controller's endpoint
      const response = await fetch(
         `https://api.erzen.xyz/oauth/consent?client_id=${clientId}&scope=${scope}`,
         {
            method: "GET",
            credentials: "include",
            headers: {
               Accept: "application/json",
               Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
         }
      );

      if (!response.ok) {
         throw new Error("Failed to fetch consent screen information");
      }

      const data = await response.json();

      console.log(data);

      if (!data.grantedScopes) {
         document.getElementById("appName").textContent = data.applicationName;
         document.getElementById("appNameInline").textContent = data.applicationName;

         document.getElementById("appIcon").src = data.logoUrl || "./cube-solid.svg";

         const scopeList = document.getElementById("scopeList");
         scopeList.innerHTML = "";

         data.requestedScopes.forEach((scope) => {
            const li = document.createElement("li");
            li.innerHTML = `<strong>${
               scope.name.charAt(0).toUpperCase() + scope.name.slice(1)
            }</strong> - ${scope.description}`;
            scopeList.appendChild(li);
         });

         document.getElementById("loadingSection").classList.add("hidden");
         document.getElementById("consentSection").classList.remove("hidden");
      } else {
         // Get authorization code using the controller's authorize endpoint
         const authResponse = await fetch(
            `https://api.erzen.xyz/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}&response_type=${responseType}`,
            {
               method: "GET",
               credentials: "include",
               headers: {
                  Accept: "application/json",
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
               },
            }
         );

         if (!authResponse.ok) {
            throw new Error("Failed to get authorization code");
         }

         const authData = await authResponse.json();

         // Redirect with authorization code
         window.location.href = authData.redirectUri;
      }
   } catch (error) {
      console.error("Failed to load application details:", error);
      alert("Failed to load application details. Please try again.");
   }
}

// Initial authentication check
async function init() {
   const isAuthenticated = await fastAuthCheck();

   if (!isAuthenticated) {
      await redirectToLogin();
      return;
   }

   await loadConsentScreen();
}

// Handle authorization
document.getElementById("authorizeBtn").addEventListener("click", async () => {
   try {
      // Grant consent using the controller's endpoint
      await fetch("https://api.erzen.xyz/oauth/consent", {
         method: "POST",
         credentials: "include",
         headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
         },
         body: JSON.stringify({
            client_id: clientId,
            scopes: scope.split(" "),
         }),
      });

      // Get authorization code using the controller's authorize endpoint
      const authResponse = await fetch(
         `https://api.erzen.xyz/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}&response_type=${responseType}`,
         {
            method: "GET",
            credentials: "include",
            headers: {
               Accept: "application/json",
               Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
         }
      );

      if (!authResponse.ok) {
         throw new Error("Failed to get authorization code");
      }

      const authData = await authResponse.json();

      // Redirect with authorization code
      window.location.href = authData.redirectUri;
   } catch (error) {
      console.error("Authorization failed:", error);
      alert("Authorization failed. Please try again.");
   }
});

// Handle denial
document.getElementById("denyBtn").addEventListener("click", () => {
   window.location.href = `${redirectUri}?error=access_denied&state=${state}`;
});

// Start the initialization
init();
