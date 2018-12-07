'use strict';
(function () {
  const DB_NAME = 'douvision-indexeddb-sticknote';
  const DB_VERSION = 1; // Use a long long for this value (don't use a float)
  const DB_STORE_NAME = 'stick_note';

  var db;

  // Used to keep track of which view is displayed to avoid uselessly reloading it
  var current_view_pub_key;

  function openDb() {
    console.log("openDb ...");
    var req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onsuccess = function (evt) {
      // Better use "this" than "req" to get the result to avoid problems with
      // garbage collection.
      // db = req.result;
      db = this.result;
      console.log("openDb DONE");
      displayPubList();
    };
    req.onerror = function (evt) {
      console.error("openDb:", evt.target.errorCode);
    };

    req.onupgradeneeded = function (evt) {
      console.log("openDb.onupgradeneeded");
      var store = evt.currentTarget.result.createObjectStore(
        DB_STORE_NAME, { keyPath: 'id', autoIncrement: true });

      store.createIndex('content', 'content', { unique: false });
    };
  }

  const summernoteDefault = {
    elementId: "#summernote",
    content: "[content data to be edited]",
    operation: "new"
  }

  const btnAddNewStickyNotes = document.getElementById("createStickyNotes");
  const btnSaveStickyNotes = document.getElementById("saveStickyNotes");
  const btnBackHome = document.getElementById("backHome");

  const contentLinstStickyNotes = document.getElementById("stickyNotes"); 
  const contentCreateUpdateStickyNotes = document.getElementById("createUpdatelistStickyNotes"); 

  /**
   * @param {string} store_name
   * @param {string} mode either "readonly" or "readwrite"
   */
  function getObjectStore(store_name, mode) {
    var tx = db.transaction(store_name, mode);
    return tx.objectStore(store_name);
  }

  function displayPubList(store) {
    console.log("displayPubList");

    if (typeof store == 'undefined')
      store = getObjectStore(DB_STORE_NAME, 'readonly');

    var listStickyNotes = $('#listStickyNotes');
    listStickyNotes.empty();

    var req;
    req = store.count();
    // Requests are executed in the order in which they were made against the
    // transaction, and their results are returned in the same order.
    // Thus the count text below will be displayed before the actual pub list
    // (not that it is algorithmically important in this case).
    req.onsuccess = function(evt) {
      console.log("There are " + evt.target.result + "record(s) in the object store.");
    };
    req.onerror = function(evt) {
      console.error("add error", this.error);
      displayActionFailure(this.error);
    };

    var i = 0;
    req = store.openCursor();
    req.onsuccess = function(evt) {
      var cursor = evt.target.result;

      // If the cursor is pointing at something, ask for the data
      if (cursor) {
        console.log("displayPubList cursor:", cursor);
        req = store.get(cursor.key);
        req.onsuccess = function (evt) {
          var value = evt.target.result;
          var list_item = $('<div class="contentSummernote" data-id="'+cursor.key+'">\
                          <button class="remove-sticke">X</button>\
                          <div  id="summernote'+cursor.key+'"></div>\
                          </div>');

          listStickyNotes.append(list_item);

          init_summernote('#summernote'+cursor.key);
          $('#summernote'+cursor.key).summernote('code', value.content);
          $('.note-statusbar').hide(); 
          $('#summernote'+cursor.key).summernote('disable');
        };

        // Move on to the next object in store
        cursor.continue();

        // This counter serves only to create distinct ids
        i++;
      } else {
        console.log("No more entries");
      }
    };
  }

  function addObjectStore(content) {
    console.log("addObjectStore ...");

    // Create a new object ready to insert into the IDB
    var content = $(summernoteDefault.elementId).summernote('code');
    var obj = { content: content };
    //console.log(newItem);
   
    var store = getObjectStore(DB_STORE_NAME, 'readwrite');
    var objectStoreRequest;

    try {
      objectStoreRequest = store.add(obj);
    } catch (evt) {
      if (evt.name == 'DataCloneError')
        console.log("This engine doesn't know how to clone a Blob, use Firefox");
      throw evt;
    }

    objectStoreRequest.onsuccess = function(event) {
      console.log("Success ...");
      displayActionSuccess();
    };

    objectStoreRequest.onerror = function(event) {
      console.error("addObjectStore", this.error);
      displayActionFailure(this.error);
    };

  }

  function updateObjectStore(index) {
    console.log("updateObjectStore ...");

    // Create a new object ready to insert into the IDB
    var content = $(summernoteDefault.elementId).summernote('code');

    var store = getObjectStore(DB_STORE_NAME, 'readwrite');

    var req = store.openCursor();
    req.onerror = function(evt) {
      console.error("case if have an error", this.error);
    };

    req.onsuccess = function(evt) {
      var cursor = evt.target.result;
      if(cursor){
        if(cursor.value.id == index){//we find by id an user we want to update
          var updateData = cursor.value;
    
          updateData.content = content;


          var req = cursor.update(updateData);
          req.onsuccess = function(e){
            console.log("Update success!!");
             displayActionSuccess("Your data was save");
          }
          req.onerror = function(e){
            console.log("Update failed: ",this.error);
            displayActionFailure(this.error);
          }
          return;
        }
        cursor.continue();
        console.log(cursor.value.id);
      } else {
        console.error('Entries displayed.');  
      }
    }

  }


  /**
   * @param {number} key
   * @param {IDBObjectStore=} store
   */
  function deletePublication(key, store) {
    console.log("deletePublication:", arguments);

    if (typeof store == 'undefined')
      store = getObjectStore(DB_STORE_NAME, 'readwrite');

    var req = store.openCursor();
    req.onerror = function(evt) {
      console.error("case if have an error", this.error);
      displayActionFailure(this.error);
    };

    req.onsuccess = function(event) {
      var cursor = event.target.result;
      if(cursor) {
        if(cursor.value.id == key) {
          var request = cursor.delete();
          request.onsuccess = function() {
            displayActionSuccess("Deletion successful");
            displayPubList(store);
            return;
          };
        }
        cursor.continue();        
      } else {
        console.log('Entries displayed.');       
      }
    };
  }

  function displayActionSuccess(msg) {
    msg = typeof msg != 'undefined' ? "Success: " + msg : "Success";
    init_toast(msg);
  }
  
  function displayActionFailure(msg) {
    msg = typeof msg != 'undefined' ? "Failure: " + msg : "Failure";
    init_toast(msg);
  }

  function registerSummernote(summernote, callbackOperation) {
    $("#summernote").summernote('destroy');
    $(summernote.elementId).summernote({      
      focus: true,
      disableResizeEditor: false,
      toolbar: false,
      callbacks: {
        onInit: function(e) {
          $(this).summernote("fullscreen.toggle");
          $(this).summernote('code', summernote.content);
          callbackOperation(summernote.operation);
        },onChange: function(contents, $editable) {
            btnSaveStickyNotes.style.display = "block";
        }
      }
    });
  }


  function addEventListeners() {
    console.log("addEventListeners");

      btnAddNewStickyNotes.addEventListener("click", (evt, params) => { 
        console.log("Params: ",params);
        console.log("new sticky notes");
        setStickyNotes(summernoteDefault);

      });

      btnSaveStickyNotes.addEventListener("click", (evt) => {
        console.log("save sticky notes");
        var data_operation = evt.currentTarget.getAttribute("data-operation");

        if (data_operation == "new") {
          addObjectStore();
        }else {
          var stickyNoteId = evt.currentTarget.getAttribute("data-id");
          updateObjectStore(stickyNoteId);     
        }
        evt.currentTarget.style.display = "none";
      });

      btnBackHome.addEventListener("click", () => {
        console.log("back home");
        contentCreateUpdateStickyNotes.style.display = "none";
        var pub_list = $("#listStickyNotes");
        pub_list.empty();
        displayPubList();
        contentLinstStickyNotes.style.display = "block";
      });

  }

  $("#listStickyNotes").on("click","button.remove-sticke",function(evt) {
    console.log("Remove ...");

      var stickyNoteId = $(this).parent().attr("data-id");
      swal({
          title: "Are you sure?",
          text: "You will not be able to recover this sticky note!",
          type: "warning",
          showCancelButton: true,
          confirmButtonClass: "btn-danger",
          confirmButtonText: "Yes, cancel it!",
          cancelButtonText: "No, keep plx!",
          closeOnConfirm: true,
          closeOnCancel: true,
          showLoaderOnConfirm: true
      },function(isConfirm) {
          if (isConfirm) {
            deletePublication(stickyNoteId);
          }
      });
      evt.stopPropagation();
  });

  $("#listStickyNotes").on("click",".contentSummernote", function () {
    console.log("Update ...");
    var stickyNoteId = $(this).attr("data-id");

    var cloneObjectStickyNote = summernoteDefault;
    cloneObjectStickyNote.content = $("#summernote"+stickyNoteId).summernote('code');
    cloneObjectStickyNote.operation = "update";
    btnSaveStickyNotes.setAttribute("data-id", stickyNoteId);
    setStickyNotes(cloneObjectStickyNote);

  });

  function setStickyNotes(summernote) {
    console.log("Object Summernote", summernote);
    contentLinstStickyNotes.style.display = "none";
    contentCreateUpdateStickyNotes.style.display = "block";


    registerSummernote(summernote, function(operation) {
      console.log("callback...");
      btnSaveStickyNotes.setAttribute("data-operation", operation);
    });

  }       
  openDb();
  addEventListeners();

})(); // Immediately-Invoked Function Expression (IIFE)