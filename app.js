
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

  submitButton.textContent = signingUp
    ? "Create account"
    : "Sign in";

  authMessage.textContent = "";
}

function showSignedIn(user) {
  authSection.classList.add("hidden");
  signedInSection.classList.remove("hidden");

  welcomeMessage.textContent = "Signed in as " + user.email;
  showMessage(sessionMessage, "");
}

function showSignedOut() {
  signedInSection.classList.add("hidden");
  authSection.classList.remove("hidden");

  passwordInput.value = "";
  sessionMessage.textContent = "";
}

signinTab.addEventListener("click", () => {
  switchMode(false);
});

signupTab.addEventListener("click", () => {
  switchMode(true);
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showMessage(authMessage, "Please enter your email and password.", true);
    return;
  }

  if (isSigningUp) {
    const passwordIsValid =
      password.length >= 8 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password);

    if (!passwordIsValid) {
      showMessage(
        authMessage,
        "Use at least 8 characters, including an uppercase letter, a lowercase letter, and a number.",
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
      result = await supabaseClient.auth.signUp({
        email,
        password
      });
    } else {
      result = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });
    }

    if (result.error) {
      throw result.error;
    }

    if (result.data.session && result.data.user) {
      showSignedIn(result.data.user);
    } else if (isSigningUp) {
      showMessage(
        authMessage,
        "Your account was created. If email confirmation is enabled, check your inbox to finish signing up."
      );
    } else {
      showMessage(
        authMessage,
        "Sign-in didn't create a session. Please try again.",
        true
      );
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

    if (error) {
      throw error;
    }

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

// Restore an existing session when the page is reopened.
async function restoreSession() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    if (data.session && data.session.user) {
      showSignedIn(data.session.user);
    } else {
      showSignedOut();
    }
  } catch (error) {
    showMessage(
      authMessage,
      "Couldn't check your saved session. Please refresh the page.",
      true
    );
  }
}

// Keep the screen updated when authentication changes.
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (session && session.user) {
    showSignedIn(session.user);
  } else if (event === "SIGNED_OUT") {
    showSignedOut();
  }
});
