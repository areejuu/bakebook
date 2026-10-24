
const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const authSection = document.getElementById("auth-section");
const signedInSection = document.getElementById("signed-in-section");
const authForm = document.getElementById("auth-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signinTab = document.getElementById("signin-tab");
const signupTab = document.getElementById("signup-tab");
const submitButton = document.getElementById("submit-button");
const passwordHelp = document.getElementById("password-help");
const authMessage = document.getElementById("auth-message");
const welcomeMessage = document.getElementById("welcome-message");
const signoutButton = document.getElementById("signout-button");
const sessionMessage = document.getElementById("session-message");

let isSigningUp = false;
let currentUser = null;
let profilePanel = null;
let profileRequestNumber = 0;

function showMessage(element, message, isError = false) {
  element.textContent = message;
  element.style.color = isError ? "#b42318" : "#356b43";
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  signinTab.disabled = isLoading;
  signupTab.disabled = isLoading;

  if (isLoading) {
    submitButton.textContent = "Please wait...";
  } else {
    submitButton.textContent = isSigningUp
      ? "Create account"
      : "Sign in";
  }
}

function switchMode(signingUp) {
  isSigningUp = signingUp;

  signinTab.classList.toggle("active", !signingUp);
  signupTab.classList.toggle("active", signingUp);
  passwordHelp.classList.toggle("hidden", !signingUp);

  passwordInput.autocomplete = signingUp
    ? "new-password"
    : "current-password";

  passwordInput.minLength = signingUp ? 8 : 1;
  submitButton.textContent = signingUp ? "Create account" : "Sign in";
  authMessage.textContent = "";
}

function createProfilePanel() {
  if (profilePanel) return profilePanel;

  profilePanel = document.createElement("div");
  profilePanel.style.margin = "20px 0";
  profilePanel.style.padding = "16px";
  profilePanel.style.borderRadius = "12px";
  profilePanel.style.background = "#fff8f1";

  const heading = document.createElement("h2");
  heading.textContent = "Choose your username";
  heading.style.color = "#5c3d2e";

  const description = document.createElement("p");
  description.textContent =
    "Pick a unique username for your BakeBook profile.";

  const form = document.createElement("form");
  form.id = "username-form";

  const label = document.createElement("label");
  label.htmlFor = "username-input";
  label.textContent = "Username";

  const input = document.createElement("input");
  input.id = "username-input";
  input.name = "username";
  input.type = "text";
  input.minLength = 3;
  input.maxLength = 20;
  input.required = true;
  input.autocomplete = "username";
  input.placeholder = "e.g. sweetbaker";
  input.pattern = "[A-Za-z0-9_]{3,20}";
  input.style.display = "block";
  input.style.width = "100%";
  input.style.boxSizing = "border-box";
  input.style.margin = "8px 0 12px";
  input.style.padding = "12px";
  input.style.borderRadius = "8px";
  input.style.border = "1px solid #d6c4b5";

  const help = document.createElement("p");
  help.textContent =
    "Use 3–20 letters, numbers, or underscores.";
  help.style.fontSize = "13px";

  const button = document.createElement("button");
  button.type = "submit";
  button.textContent = "Save username";

  const message = document.createElement("p");
  message.id = "username-message";
  message.setAttribute("role", "status");

  form.append(label, input, help, button, message);
  profilePanel.append(heading, description, form);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) return;

    const username = input.value.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      showMessage(
        message,
        "Use 3–20 letters, numbers, or underscores.",
        true
      );
      return;
    }

    button.disabled = true;
    input.disabled = true;
    showMessage(message, "Saving username...");

    try {
      const { error } = await supabaseClient
        .from("profiles")
        .insert({
          id: currentUser.id,
          username
        });

      if (error) {
        if (error.code === "23505") {
          throw new Error(
            "That username is already taken. Try another one."
          );
        }
        throw error;
      }

      welcomeMessage.textContent =
        "Welcome to BakeBook, @" + username + "!";

      profilePanel.replaceChildren();

      const success = document.createElement("p");
      success.textContent = "Your username has been saved!";
      profilePanel.appendChild(success);
    } catch (error) {
      showMessage(
        message,
        error.message || "Couldn't save your username. Please try again.",
        true
      );
      button.disabled = false;
      input.disabled = false;
    }
  });

  return profilePanel;
}


async function loadProfile(user, requestNumber) {
  const panel = createProfilePanel();

  if (!panel.isConnected) {
    signedInSection.insertBefore(panel, signoutButton);
  }

  panel.hidden = false;

  try {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    if (requestNumber !== profileRequestNumber) return;
    if (!currentUser || currentUser.id !== user.id) return;

    if (error) throw error;

    if (data) {
      welcomeMessage.textContent =
        "Welcome to BakeBook, @" + data.username + "!";

      panel.replaceChildren();

      const greeting = document.createElement("p");
      greeting.textContent = "Your profile is ready.";
      panel.appendChild(greeting);
    } else {
      panel.replaceChildren();

      const heading = document.createElement("h2");
      heading.textContent = "Choose your username";

      const description = document.createElement("p");
      description.textContent =
        "Pick a unique username for your BakeBook profile.";

      const form = document.createElement("form");
      form.id = "username-form";

      const label = document.createElement("label");
      label.htmlFor = "username-input";
      label.textContent = "Username";

      const input = document.createElement("input");
      input.id = "username-input";
      input.name = "username";
      input.type = "text";
      input.minLength = 3;
      input.maxLength = 20;
      input.required = true;
      input.pattern = "[A-Za-z0-9_]{3,20}";
      input.placeholder = "e.g. sweetbaker";

      const button = document.createElement("button");
      button.type = "submit";
      button.textContent = "Save username";

      const message = document.createElement("p");
      message.id = "username-message";
      message.setAttribute("role", "status");

      form.append(label, input, button, message);
      panel.append(heading, description, form);

      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = input.value.trim().toLowerCase();

        if (!/^[a-z0-9_]{3,20}$/.test(username)) {
          showMessage(
            message,
            "Use 3–20 letters, numbers, or underscores.",
            true
          );
          return;
        }

        button.disabled = true;
        showMessage(message, "Saving username...");

        try {
          const { error: saveError } = await supabaseClient
            .from("profiles")
            .insert({ id: user.id, username });

          if (saveError) {
            if (saveError.code === "23505") {
              throw new Error(
                "That username is taken. Please try another."
              );
            }
            throw saveError;
          }

          welcomeMessage.textContent =
            "Welcome to BakeBook, @" + username + "!";

          panel.replaceChildren();

          const success = document.createElement("p");
          success.textContent = "Your username has been saved!";
          panel.appendChild(success);
        } catch (saveError) {
          showMessage(
            message,
            saveError.message || "Couldn't save username. Try again.",
            true
          );
          button.disabled = false;
        }
      });
    }
  } catch (error) {
    if (requestNumber !== profileRequestNumber) return;

    panel.replaceChildren();

    const errorText = document.createElement("p");
    errorText.textContent =
      "Couldn't load your profile. Please refresh and try again.";
    panel.appendChild(errorText);

    console.error("Profile loading error:", error);
  }
}


  panel.querySelector("h2").textContent = "Loading your profile...";
  panel.querySelector("p").textContent = "Please wait.";
  panel.querySelector("form").hidden = true;

  try {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    if (requestNumber !== profileRequestNumber) return;
    if (!currentUser || currentUser.id !== user.id) return;

    if (error) throw error;

    if (data) {
      welcomeMessage.textContent =
        "Welcome to BakeBook, @" + data.username + "!";

      panel.replaceChildren();
      const greeting = document.createElement("p");
      greeting.textContent = "Your profile is ready.";
      panel.appendChild(greeting);
    } else {
      panel.replaceChildren(createProfilePanel().firstChild);
      const refreshedPanel = createProfilePanel();
      panel.replaceChildren(...refreshedPanel.childNodes);
      panel.querySelector("h2").textContent = "Choose your username";
      panel.querySelector("p").textContent =
        "Pick a unique username for your BakeBook profile.";
      panel.querySelector("form").hidden = false;
    }
  } catch (error) {
    if (requestNumber !== profileRequestNumber) return;

    panel.replaceChildren();
    const errorText = document.createElement("p");
    errorText.textContent =
      "Couldn't load your profile. Please refresh and try again.";
    showMessage(errorText, errorText.textContent, true);
    panel.appendChild(errorText);
  }
}

function showSignedIn(user) {
  currentUser = user;
  const requestNumber = ++profileRequestNumber;

  authSection.classList.add("hidden");
  signedInSection.classList.remove("hidden");

  welcomeMessage.textContent = "Signed in as " + user.email;
  sessionMessage.textContent = "";

  loadProfile(user, requestNumber);
}

function showSignedOut() {
  currentUser = null;
  profileRequestNumber++;

  signedInSection.classList.add("hidden");
  authSection.classList.remove("hidden");

  passwordInput.value = "";
  sessionMessage.textContent = "";

  if (profilePanel) {
    profilePanel.remove();
    profilePanel = null;
  }
}

signinTab.addEventListener("click", () => switchMode(false));
signupTab.addEventListener("click", () => switchMode(true));

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showMessage(authMessage, "Enter your email and password.", true);
    return;
  }

  if (isSigningUp) {
    const valid =
      password.length >= 8 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password);

    if (!valid) {
      showMessage(
        authMessage,
        "Use at least 8 characters, including uppercase, lowercase, and a number.",
        true
      );
      return;
    }
  }

  setLoading(true);
  authMessage.textContent = "";

  try {
    let result;

    if (isSigningUp) {
      result = await supabaseClient.auth.signUp({ email, password });
    } else {
      result = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });
    }

    if (result.error) throw result.error;

    if (result.data.session && result.data.user) {
      showSignedIn(result.data.user);
    } else if (isSigningUp) {
      showMessage(
        authMessage,
        "Account created. Check your email if confirmation is required."
      );
    } else {
      showMessage(authMessage, "Couldn't start your session. Try again.", true);
    }
  } catch (error) {
    showMessage(
      authMessage,
      error.message || "Something went wrong. Please try again.",
      true
    );
  } finally {
    setLoading(false);
  }
});

signoutButton.addEventListener("click", async () => {
  signoutButton.disabled = true;
  showMessage(sessionMessage, "");

  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;

    showSignedOut();
    switchMode(false);
    showMessage(authMessage, "You've signed out successfully.");
  } catch (error) {
    showMessage(
      sessionMessage,
      error.message || "Couldn't sign out. Please try again.",
      true
    );
  } finally {
    signoutButton.disabled = false;
  }
});

async function restoreSession() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    showMessage(authMessage, "Couldn't restore your session. Refresh the page.", true);
    return;
  }

  if (data.session?.user) {
    showSignedIn(data.session.user);
  } else {
    showSignedOut();
  }
}

supabaseClient.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    // Run after the auth callback finishes.
    setTimeout(() => showSignedIn(session.user), 0);
  } else if (event === "SIGNED_OUT") {
    showSignedOut();
  }
});

restoreSession();
