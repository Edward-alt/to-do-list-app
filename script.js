    let todoList = [];

    function addItem() {
        let newItem = document.getElementById("new-item").value.trim();
        if (newItem !== "") {
            todoList.push(newItem);
            displayList();
            document.getElementById("new-item").value = "";
        }
    }

    function deleteItem(index) {
        todoList.splice(index, 1);
        displayList();
    }

    function updateItem(index) {
        let updatedItem = prompt("Enter the updated item:");
        if (updatedItem !== null && updatedItem.trim() !== "") {
            todoList[index] = updatedItem;
            displayList();
        }
    }

    function displayList() {
        let list = document.getElementById("todo-list");
        list.innerHTML = "";
        todoList.forEach((item, index) => {
            let li = document.createElement("li");
            li.textContent = item;
            let btnGroup = document.createElement("div");
            btnGroup.className = "btn-group";
            let deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";
            deleteButton.onclick = function() {
                deleteItem(index);
            };
            let updateButton = document.createElement("button");
            updateButton.textContent = "Update";
            updateButton.onclick = function() {
                updateItem(index);
            };
            btnGroup.appendChild(deleteButton);
            btnGroup.appendChild(updateButton);
            li.appendChild(btnGroup);
            list.appendChild(li);
        });
    }
