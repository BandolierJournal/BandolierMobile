/*jshint node: true, esversion: 6*/
'use strict';
var bulletDefinition = function(){
    class Bullet {
        constructor(content) {
            if (typeof content === 'string' || !content) {
                this.content = content;
                this.collections = [];
            } else {
                if (!this.collections) this.collections = [];
                _.extend(this, content);
            }
        }

        createCopy() {
            let newBullet = new Bullets[this.type](this.content);
            newBullet.type = this.type;
            return newBullet;
        }

        moveTo(collectionName, type) {
            const Collection = require('./collection');
            return Collection.fetchAll({
                    title: collectionName,
                    type: type
                })
                .then(collection => {
                    let newBullet = this.createCopy();
                    return collection[0].addBullet(newBullet);
                })
                .catch(err => console.error(`Move Error: could not move ${this.content} to ${collectionName}`));
        }

        save() {
            if (this.content || this.rev) {
                if (!this.id) this.id = new Date().toISOString();
                return db.rel.save('bullet', this);
            }
        }

        delete() {
            if (this.rev) return db.rel.del('bullets', this);
        }

    }

    class Note extends Bullet {
        constructor(content) {
            super(content);
            this.type = 'Note';
        }
    }

    class DatedBullet extends Bullet {
        constructor(content, date, status) {
            super(content);
            this.date = date || this.date;
            this.status = status || this.status || 'incomplete';
        }

        schedule(date, type) {
            return this.moveTo(date, type)
                .then(res => {
                    this.status = 'scheduled';
                    return this.save();
                })
                .catch(err => console.err('Scheduling Failed: ', err));
        }
    }

    class Task extends DatedBullet {
        constructor(content, date, status) {
            super(content, date, status);
            this.type = 'Task';
        }

        migrate() {
            const nextMonth = moment(this.date).add(1, 'month').startOf('month').toISOString();
            return this.moveTo(nextMonth, 'month')
                .then(res => {
                    this.status = 'migrated';
                    return this.save();
                })
                .catch(err => console.error('Migration Failed: ', err));
        }

        toggleDone() {
            if (this.status === 'migrated') return this;
            this.status = (this.status === 'incomplete') ? 'complete' : 'incomplete';
            return this;
        }

        toggleStrike() {
            if (this.status === 'migrated') return this;
            this.status = (this.status === 'struck') ? 'incomplete' : 'struck';
            return this;
        }

    }

    class EventBullet extends DatedBullet {
        constructor(content, date, status) {
            super(content, date, status);
            this.type = 'Event';
        }
    }

    function fetchAll(string) {
        return db.rel.find('bulletShort')
            .then(res => {
                let bullets = res.bulletShorts;
                if (string) bullets = bullets.filter(b => b.content.includes(string));
                return bullets;
            })
            .catch(err => console.error('could not fetch bullets', err));
    }
    //May need to fix this...
    const Bullets = {
        Task: Task,
        Event: EventBullet,
        Note: Note,
        fetchAll: fetchAll
    };
    return Bullets
  }

  const Bullet = bulletDefinition()
