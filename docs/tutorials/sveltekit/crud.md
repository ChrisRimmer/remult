# CRUD Operations

## Adding new tasks

Now that we can see the list of tasks, it's time to add a few more. We create a form which executes the `addTask` function that invokes `taskRepo.insert()`. Update your `+page.svelte` as follows:

::: code-group

```svelte [src/routes/+page.svelte]

<script lang="ts">
  import { remult } from "remult";
  import { onMount } from "svelte";
  import { Task } from "../shared/Task";

  let tasks: Task[] = [];

  onMount(async () => {
    tasks = await remult.repo(Task).find();
  });

  let newTaskTitle = ""; // [!code ++]
  const addTask = async () => {// [!code ++]
    const newTask = await remult.repo(Task).insert({ title: newTaskTitle });// [!code ++]
    tasks = [...tasks, newTask];// [!code ++]
    newTaskTitle = "";// [!code ++]
  };// [!code ++]
</script>

<div>
  <h1>todos</h1>
  <main>
    <form method="POST" on:submit|preventDefault={addTask}>// [!code ++]
      <input bind:value={newTaskTitle} placeholder="What needs to be done?" />// [!code ++]
      <button>Add</button>// [!code ++]
    </form>// [!code ++]

    {#each tasks as task}
      <div>
        <input type="checkbox" bind:checked={task.completed} />
        <span>{task.title}</span>
      </div>
    {/each}
  </main>
</div>

```

:::
The call to `insert` will make a post request to the server, insert the new task to the db, and return the new Task object with all it's info (including the id generated by the database)

Try adding a few tasks to see how it works.

## Mark Tasks as Completed

1. Add a `setCompleted` function in the script section as follows:

```ts
const setCompleted = async (task: Task, completed: boolean) => {
  await remult.repo(Task).save({ ...task, completed })
}
```

2. Modify the checkbox to invoke the method:

```svelte
<div>
	<input
		type="checkbox"
		bind:checked={task.completed}
		on:click={(e) => setCompleted(task, e.target.checked)}
	/>
	{task.title}
</div>
```

## Rename Tasks

To make the tasks in the list updatable, we'll use an `input` element and bind it to the task's `title` property. We'll also add a _Save_ button to commit the changes to the backend database.

1. Add a `saveTask` function in the script section as follows:

```ts
const saveTask = async (task: Task) => {
  await remult.repo(Task).save({ ...task })
}
```

2. Update the html part

```svelte
{#each tasks as task}
	<div>
		<input
			type="checkbox"
			bind:checked={task.completed}
			on:click={(e) => setCompleted(task, e.target.checked)}
		/>
		<input name="title" bind:value={task.title} />
		<button on:click={() => saveTask(task)}>Save</button>
	</div>
{/each}
```

The `saveTask` function saves the task that is passed in. Since the task's title is bound to the `input`, changes are made directly to the task.

Make some changes and refresh the browser to verify that the backend database is updated.

::: tip Browser's Network tab
As you play with these `CRUD` capabilities, monitor the network tab and see that they are all translated to `rest` api calls.
:::

## Delete Tasks

Let's add a _Delete_ button next to the **Save** button of each task in the list.

1. Add the `deleteTask` function

```ts
const deleteTask = async (task: Task) => {
  await remult.repo(Task).delete(task)
  tasks = tasks.filter((c) => c.id !== task.id)
}
```

2. Add the **Delete** button

```svelte
{#each tasks as task}
	<div>
		<input
			type="checkbox"
			bind:checked={task.completed}
			on:click={(e) => setCompleted(task, e.target.checked)}
		/>
		<input name="title" bind:value={task.title} />
		<button on:click={() => saveTask(task)}>Save</button>
		<button on:click={() => deleteTask(task)}>Delete</button> // [!code ++]
	</div>
{/each}
```
