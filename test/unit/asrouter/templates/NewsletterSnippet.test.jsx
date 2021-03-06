import {mount} from "enzyme";
import {NewsletterSnippet} from "content-src/asrouter/templates/NewsletterSnippet/NewsletterSnippet.jsx";
import React from "react";
import schema from "content-src/asrouter/templates/NewsletterSnippet/NewsletterSnippet.schema.json";

const DEFAULT_CONTENT = {
  text: "foo",
  scene2_text: "bar",
  button_label: "Sign Up",
  form_action: "foo.com",
  hidden_inputs: {"foo": "foo"},
};

describe("NewsletterSnippet", () => {
  let sandbox;
  let onBlockStub;

  /**
   * mountAndCheckProps - Mounts a NewsletterSnippet with DEFAULT_CONTENT extended with any props
   *                      passed in the content param and validates props against the schema.
   * @param {obj} content Object containing custom message content (e.g. {text, icon, title})
   * @returns enzyme wrapper for SimpleSnippet
   */
  function mountAndCheckProps(content = {}) {
    const props = {
      content: Object.assign({}, DEFAULT_CONTENT, content),
      onBlock: onBlockStub,
      onDismiss: sandbox.stub(),
      sendUserActionTelemetry: sandbox.stub(),
      onAction: sandbox.stub(),
    };
    assert.jsonSchema(props.content, schema);
    return mount(<NewsletterSnippet {...props} />);
  }

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    onBlockStub = sandbox.stub();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should render .text", () => {
    const wrapper = mountAndCheckProps({text: "bar"});
    assert.equal(wrapper.find(".body").text(), "bar");
  });
  it("should not render title element if no .title prop is supplied", () => {
    const wrapper = mountAndCheckProps();
    assert.lengthOf(wrapper.find(".title"), 0);
  });
  it("should render .title", () => {
    const wrapper = mountAndCheckProps({title: "Foo"});
    assert.equal(wrapper.find(".title").text(), "Foo");
  });
  it("should render .icon", () => {
    const wrapper = mountAndCheckProps({icon: "data:image/gif;base64,R0lGODl"});
    assert.equal(wrapper.find(".icon").prop("src"), "data:image/gif;base64,R0lGODl");
  });
  it("should render .button_label and default className", () => {
    const wrapper = mountAndCheckProps({button_label: "Click here"});

    const button = wrapper.find("button.ASRouterButton");
    assert.equal(button.text(), "Click here");
    assert.equal(button.prop("className"), "ASRouterButton");
  });

  describe("#SignupView", () => {
    let wrapper;
    const fetchOk = {json: () => Promise.resolve({status: "ok"})};
    const fetchFail = {json: () => Promise.resolve({status: "fail"})};

    beforeEach(() => {
      wrapper = mountAndCheckProps({
        text: "bar",
        scene2_email_placeholder_text: "Email",
        scene2_text: "signup",
      });
    });

    it("should show the signup form if state.expanded is true", () => {
      wrapper.setState({expanded: true});

      assert.isTrue(wrapper.find("form").exists());
    });
    it("should dismiss the snippet", () => {
      wrapper.setState({expanded: true});

      wrapper.find(".ASRouterButton.secondary").simulate("click");

      assert.calledOnce(wrapper.props().onDismiss);
    });
    it("should render hidden inputs + email input", () => {
      wrapper.setState({expanded: true});

      assert.lengthOf(wrapper.find("input[type='hidden']"), 1);
    });
    it("should open the SignupView when the action button is clicked", () => {
      assert.isFalse(wrapper.find("form").exists());

      wrapper.find(".ASRouterButton").simulate("click");

      assert.isTrue(wrapper.state().expanded);
      assert.isTrue(wrapper.find("form").exists());
    });
    it("should submit form data when submitted", () => {
      sandbox.stub(window, "fetch").resolves(fetchOk);
      wrapper.setState({expanded: true});

      wrapper.find("form").simulate("submit");
      assert.calledOnce(window.fetch);
    });
    it("should send user telemetry when submitted", () => {
      wrapper.setState({expanded: true});

      wrapper.find("form").simulate("submit");

      assert.equal(wrapper.props().sendUserActionTelemetry.firstCall.args[0].value, "conversion-subscribe-activation");
    });
    it("should set signupSuccess when submission status is ok", async () => {
      sandbox.stub(window, "fetch").resolves(fetchOk);
      wrapper.setState({expanded: true});
      await wrapper.instance().handleSubmit({preventDefault: sandbox.stub()});

      assert.equal(wrapper.state().signupSuccess, true);
      assert.equal(wrapper.state().signupSubmitted, true);
      assert.calledOnce(onBlockStub);
      assert.calledWithExactly(onBlockStub, {preventDismiss: true});
    });
    it("should send user telemetry when submission status is ok", async () => {
      sandbox.stub(window, "fetch").resolves(fetchOk);
      wrapper.setState({expanded: true});
      await wrapper.instance().handleSubmit({preventDefault: sandbox.stub()});

      assert.equal(wrapper.props().sendUserActionTelemetry.secondCall.args[0].value, "subscribe-success");
    });
    it("should not block the snippet if submission failed", async () => {
      sandbox.stub(window, "fetch").resolves(fetchFail);
      wrapper.setState({expanded: true});
      await wrapper.instance().handleSubmit({preventDefault: sandbox.stub()});

      assert.equal(wrapper.state().signupSuccess, false);
      assert.equal(wrapper.state().signupSubmitted, true);
      assert.notCalled(onBlockStub);
    });
    it("should send user telemetry if submission failed", async () => {
      sandbox.stub(window, "fetch").resolves(fetchFail);
      wrapper.setState({expanded: true});
      await wrapper.instance().handleSubmit({preventDefault: sandbox.stub()});

      assert.equal(wrapper.props().sendUserActionTelemetry.secondCall.args[0].value, "subscribe-error");
    });
    it("should render the signup success message", () => {
      wrapper.setProps({content: {success_text: "success"}});
      wrapper.setState({signupSuccess: true, signupSubmitted: true});

      assert.isTrue(wrapper.find(".body").exists());
      assert.equal(wrapper.find(".body").text(), "success");
      assert.isFalse(wrapper.find(".ASRouterButton").exists());
    });
    it("should render the button to return to the signup form", () => {
      wrapper.setState({signupSubmitted: true, signupSuccess: false});

      assert.isTrue(wrapper.find(".ASRouterButton").exists());
      wrapper.find(".ASRouterButton").simulate("click");

      assert.equal(wrapper.state().signupSubmitted, false);
    });
  });
});
