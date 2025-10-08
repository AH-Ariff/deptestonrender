const get = (x) => document.querySelector(x);
const getAll = (x) => document.querySelectorAll(x);
const log = (x) => console.log(x);
const el = (x) => document.createElement(x);
const div = () => el("div");

//Elements
const posts = get(".posts");
const newBtn = get(".new-btn");
const newPost = get(".new-post");
const imgInput = get("#image");
const updateContainer = get(".update-post");
const newForm = newPost.querySelector("form");
const updateForm = updateContainer.querySelector("form");
const postArea = get("#post");
const updateArea = get(".update-area");
const feedbackBox = get(".feedback-box");

let updateId;

const url = ENV.ROOT_URL || "https://localhost:300";

window.addEventListener("DOMContentLoaded", () => initPosts());
newBtn.addEventListener("click", () => newPost.classList.add("block"));
newPost.addEventListener("click", () => newPost.classList.remove("block"));
updateContainer.addEventListener("click", () =>
  updateContainer.classList.remove("block")
);
newForm.addEventListener("click", (e) => e.stopPropagation());
updateForm.addEventListener("click", (e) => e.stopPropagation());

newForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const formData = new FormData(newForm);
  createPost(formData);
});

imgInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      const preview = get(".preview");
      preview.src = reader.result;
      preview.style.display = "block";
      const label = get("label[for='image']");
      label.style.display = "none";
    };
    reader.readAsDataURL(file);
  }
});

updateForm.addEventListener("submit", (e) => {
  e.preventDefault();
  updatePost(updateId, updateArea.value);
});

//Functions
async function createPost(formData) {
  try {
    const res = await fetch(`${url}/post`, {
      method: "POST",
      body: formData,
    });
    console.log(res);

    const output = await res.json();
    const { message, data } = output;

    if (message === "success") {
      feedbackBox.innerText = "Post created successfully.";
      showPost(data.text, data.id, data.url);
      postArea.value = "";
      newPost.classList.remove("block");
    } else {
      feedbackBox.innerText = message;
    }
  } catch (err) {
    console.error(err);
    feedbackBox.innerText = "Post creation failed!";
  }
  showFeed(1000);
}

async function deletePost(id) {
  try {
    const res = await fetch(`${url}/${id}`, { method: "DELETE" });
    const data = await res.json();
    feedbackBox.innerText = "Post deleted succssfully.";
    document.getElementById(id).remove();
    log(data);
  } catch (err) {
    feedbackBox.innerText = "Post deletion failed!.";
    console.error(err);
  }

  showFeed(1000);
}

async function updatePost(id, newText) {
  try {
    const res = await fetch(`${url}/post/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newText }),
    });

    const data = await res.json();

    if (data.message === "success") {
      feedbackBox.innerText = "Updated successfully.";
      document.getElementById(updateId).querySelector("p").innerText =
        updateArea.value;

      updateContainer.classList.remove("block");
      updateArea.value = "";
    } else feedbackBox.innerText = "Could not update.";
  } catch (err) {
    console.error(err);
    feedbackBox.innerText = "Could not update.";
  }

  showFeed(1000);
}

async function initPosts() {
  const res = await fetch(`${url}/posts`);
  const data = await res.json();

  if (data[0]) data.forEach((el) => showPost(el.text, el.id, el.url));
}

function showPost(text, id, imgUrl) {
  const container = div();
  container.id = `${id}`;
  container.className = "post-container";

  const toolbox = div();
  toolbox.className = "post-tool-box";

  const editIcon = el("i");
  editIcon.setAttribute("id", "post-editor");
  editIcon.className = "fa-solid fa-pencil";
  editIcon.addEventListener("click", () => {
    updateContainer.classList.add("block");
    updateId = `${id}`;
    updateArea.value = container.querySelector(".post-content").innerText;
  });
  toolbox.appendChild(editIcon);

  const deleteIcon = el("i");
  deleteIcon.setAttribute("id", "post-remover");
  deleteIcon.className = "fa-solid fa-trash";
  deleteIcon.addEventListener("click", () => {
    handleCrud(4, deleteIcon.closest(".post-container").id);
  });
  toolbox.appendChild(deleteIcon);

  container.appendChild(toolbox);

  const content = el("p");
  content.className = "post-content";
  content.innerText = text;
  container.appendChild(content);

  if (imgUrl) {
    const imgContainer = div();
    imgContainer.className = "post-image-container";
    container.appendChild(imgContainer);

    const img = el("img");
    img.className = "post-image";
    img.src = imgUrl;
    img.onload = () => imgContainer.appendChild(img);
  }

  document.querySelector(".p").prepend(container);
}

function showFeed(time) {
  feedbackBox.classList.add("show-feed");
  setTimeout(() => feedbackBox.classList.remove("show-feed"), time);
}

function handleCrud(param, id) {
  const checkBox = div();
  checkBox.className = "flex flex-col p-2 bg-white text-black absolute";
  const text = el("p");
  checkBox.appendChild(text);
  const btns = div();
  btns.className = "flex justify-end gap-4";
  const next = el("button");
  const cancel = el("button");
  btns.append(cancel, next);
  checkBox.append(text, btns);
  switch (param) {
    case 4:
      text.innerText = "This proccess cannot be undone.";
      next.innerText = "Delete";
      cancel.innerText = "Cancel";
      next.addEventListener("click", () => {
        deletePost(id);
        checkBox.remove();
      });
      cancel.addEventListener("click", () => checkBox.remove());
  }
  document.body.appendChild(checkBox);
}
