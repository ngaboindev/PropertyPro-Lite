// Import the dependencies for testing
import chai from 'chai';
import chaiHttp from 'chai-http';
import sinon from 'sinon';
import httpMocks from 'node-mocks-http';
import Joi from '@hapi/joi';
import { uploader } from 'cloudinary';
import app from '../index';
import { genericValidator } from '../middleware/validation';
import utils from './utils';
import { initDB } from '../database/db_init';

// create sinon sandbox
const sandBox = sinon.createSandbox();

// Configure chai
chai.use(chaiHttp);
chai.should();

// eslint-disable-next-line no-unused-vars
const { expect, assert } = chai;

describe('Properties', () => {
  before(async () => {
    await initDB();
  });
  describe('GET /', () => {
    it('should return all properties listed', done => {
      chai
        .request(app)
        .get('/api/v2/properties')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.have.property('data');
          done();
        });
    });

    it('should return a specific property listed', done => {
      chai
        .request(app)
        .get('/api/v2/property/1')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.have.property('data').be.a('object');
          done();
        });
    });

    it('should return 404 when  specified property is not found!', done => {
      chai
        .request(app)
        .get('/api/v2/property/100')
        .end((err, res) => {
          res.should.have.status(404);
          res.body.should.have.property('error').be.a('string');
          res.body.should.have.property('error').eql('No property found');
          done();
        });
    });

    it('should return  properties by type', done => {
      chai
        .request(app)
        .get('/api/v2/property?type=3 bedroom')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.have.property('data').be.a('array');
          done();
        });
    });
    it('should return 404 if no available properties of such type', done => {
      chai
        .request(app)
        .get('/api/v2/property?type=3 express')
        .end((err, res) => {
          res.should.have.status(404);
          res.body.should.have
            .property('error')
            .be.a('string')
            .eql('No available properties of such a type');
          done();
        });
    });
  });

  describe('PATCH /', () => {
    it('it should return 404 after failed to updated specific property', done => {
      chai
        .request(app)
        .patch('/api/v2/property/100')
        .set('Authorization', `Bearer ${utils.getUserToken(1)}`)
        .send({
          price: 1000
        })
        .end((err, res) => {
          res.should.have.status(404);
          res.body.should.have
            .property('error')
            .eql('property your are trying to update is not available!');
          done();
        });
    });
    it('it should fails with errors if you dont meet required properties', done => {
      chai
        .request(app)
        .patch('/api/v2/property/1')
        .set('Authorization', `Bearer ${utils.getUserToken(1)}`)
        .send({
          prices: 1000
        })
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.have.property('errors').be.a('array');
          done();
        });
    });
    it('it should fails you try to update property which not yours', done => {
      chai
        .request(app)
        .patch('/api/v2/property/1')
        .set('Authorization', `Bearer ${utils.getUserToken(2)}`)
        .send({
          price: 1000
        })
        .end((err, res) => {
          res.should.have.status(403);
          done();
        });
    });
    it('it should return 200 after successfully updated specific property', done => {
      chai
        .request(app)
        .patch('/api/v2/property/1')
        .set('Authorization', `Bearer ${utils.getUserToken(1)}`)
        .send({
          price: 100
        })
        .end((err, res) => {
          res.should.have.status(200);
          done();
        });
    });

    it('it should mark as sold specified property', done => {
      chai
        .request(app)
        .patch('/api/v2/property/1/sold')
        .set('content-type', 'application/json')
        .set('Authorization', `Bearer ${utils.getUserToken(1)}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.have
            .property('data')
            .be.a('object')
            .have.property('status')
            .eql('sold');
          done();
        });
    });
    it('it should 403 if you try to mark as sold property which not yours', done => {
      chai
        .request(app)
        .patch('/api/v2/property/1/sold')
        .set('content-type', 'application/json')
        .set('Authorization', `Bearer ${utils.getUserToken(2)}`)
        .end((err, res) => {
          res.should.have.status(403);
          res.body.should.have
            .property('error')
            .have.property('message')
            .eql('You are allowed to mark as sold your property only!');
          done();
        });
    });

    it('it should fails to mark property as sold if not available', done => {
      chai
        .request(app)
        .patch('/api/v2/property/100/sold')
        .set('content-type', 'application/json')
        .set('Authorization', `Bearer ${utils.getUserToken(1)}`)
        .end((err, res) => {
          res.should.have.status(404);
          res.body.should.have.property('error').be.eql('No property found');
          done();
        });
    });
  });

  describe('POST /', () => {
    it('it should return 201 and newly created property object', done => {
      // stripped down result from cloudinary
      const cloudnaryRes = {
        public_id: 'eneivicys42bq5f2jpn2',
        url: 'https://res.cloudinary.com/mucyomiller/image/upload/v1562518550/apartment1_hemjm4.jpg'
      };
      sandBox.stub(uploader, 'upload').returns(cloudnaryRes);
      chai
        .request(app)
        .post('/api/v2/property')
        .set('Authorization', `Bearer ${utils.getUserToken(1)}`)
        .attach('image', 'server/test/treva.png', 'treva.png')
        .field('price', '100')
        .field('state', 'Rwanda')
        .field('city', 'Kigali')
        .field('address', 'KK 1 st')
        .field('type', '3 bedroom')
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.have
            .property('data')
            .have.property('image_url')
            .eql(
              'https://res.cloudinary.com/mucyomiller/image/upload/v1562518550/apartment1_hemjm4.jpg'
            );
          res.body.should.have
            .property('data')
            .have.property('address')
            .eql('KK 1 st');
        });
      done();
    });
  });

  describe('Middlewares', () => {
    it('it should return valids response depending input given', done => {
      const nextSpy = sinon.spy();
      const req = httpMocks.createRequest();
      const res = httpMocks.createResponse();
      const schema = Joi.object().keys({
        price: Joi.number().min(0),
        state: Joi.string().min(2),
        city: Joi.string().min(2),
        address: Joi.string().min(2),
        type: Joi.string().min(3)
      });
      genericValidator(req, res, schema, nextSpy);
      // eslint-disable-next-line no-unused-expressions
      expect(nextSpy.calledOnce).to.be.true;
      genericValidator(req, res, schema, () => {
        expect(res).to.have.property('status');
      });
      done();
    });
  });
  describe('DELETE /', () => {
    it('it should return 403 when try to delete property which not yours', done => {
      chai
        .request(app)
        .delete('/api/v2/property/1')
        .set('Authorization', `Bearer ${utils.getUserToken(2)}`)
        .end((err, res) => {
          res.should.have.status(403);
          res.body.should.have
            .property('error')
            .have.property('message')
            .eql('You are allowed to delete your property only!');
          done();
        });
    });

    it('it should return 200 status when delete operation was successful', done => {
      chai
        .request(app)
        .delete('/api/v2/property/1')
        .set('Authorization', `Bearer ${utils.getUserToken(1)}`)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.have.property('status').eql(200);
          res.body.should.have.property('message').be.a('string');
          res.body.should.have.property('message').eql('Property deleted successfully');
          done();
        });
    });

    it('it should return 404 with error when deletion fails', done => {
      chai
        .request(app)
        .delete('/api/v2/property/100')
        .set('Authorization', `Bearer ${utils.getAdminToken()}`)
        .end((err, res) => {
          res.status.should.eql(404);
          res.body.should.have.property('error').be.a('string');
          res.body.should.have.property('error').eql('no property found!');
          done();
        });
    });
  });
});
