(async () => {
	const response = await fetch("events.json");
	const events = await response.json();

	const eventsList = document.querySelector("main");
	const queryInput = document.querySelector("#query");

	function filter(query) {
		eventsList.innerHTML = "";
		events.forEach(event => {

			// If filter is applied then filter out.
			if (query !== null && !event.name.toLowerCase().includes(query.toLowerCase())) {
				return;
			}

			const placeholder = document.createElement("div");
			placeholder.classList.add("box");
			placeholder.classList.add("padding-3");
			placeholder.classList.add("flex-column");
			placeholder.classList.add("gap-2");
			placeholder.classList.add("rounded-1");

			const eventName = document.createElement("div");
			eventName.classList.add("text-orange");
			eventName.classList.add("font-bold");
			eventName.textContent = event.name;
			placeholder.appendChild(eventName);

			if (event.description.length > 0) {
				const eventDescription = document.createElement("div");
				eventDescription.classList.add("text-gray");
				eventDescription.innerHTML = marked.parse(event.description);
				placeholder.appendChild(eventDescription);
			}

			if (event.args.length > 0) {
				const eventArgs = document.createElement("table");

				event.args.forEach(arg => {
					const tr = document.createElement("tr");

					const td1 = document.createElement("td");
					td1.classList.add("width-5");
					td1.textContent = arg.key;
					tr.appendChild(td1);

					const td2 = document.createElement("td");
					td2.innerHTML = marked.parse(arg.description);
					tr.appendChild(td2);

					eventArgs.appendChild(tr);
				});
				placeholder.appendChild(eventArgs);
			}
			eventsList.appendChild(placeholder);
		});
	}

	// Initial filter which is no filter.
	filter(null);

	// Listen to user input for filter.
	queryInput.addEventListener("input", evt => {
		filter(evt.target.value.trim());
	});
})();
